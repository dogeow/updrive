import axios from 'axios'
import EventEmitter from 'events'
import Fs from 'fs'
import { basename } from 'path'
import { prepend, groupBy } from 'ramda'
import localforage from 'localforage'

import { base64, throttle } from '@/api/tool'

const now = () => Math.floor(Date.now() / 1000)

// 上传和下载应该分开
// 大量文件下性能问题未知

const Job = {
  initStore: {
    version: 0.1,
    data: [],
  },

  status: {
    downloading: { name: '下载中...', value: 'downloading' },
    uploading: { name: '上传中...', value: 'uploading' },
    interrupted: { name: '已暂停', value: 'interrupted' },
    completed: { name: '已完成', value: 'completed' },
    error: { name: '错误', value: 'error' },
  },

  setup(keyPre, onChange) {
    this.storeKey = `${keyPre}:job`
    this.on('change', onChange)
  },

  async createDownloadItem(url, localPath) {
    const filename = basename(localPath)
    const startTime = now()
    const id = base64(`${filename}:${startTime}`)
    const item = {
      id: id, // 唯一ID
      url: url, // 远程路径
      connectType: 'download', // 类型 download upload
      localPath: localPath, // 下载本地路径
      startTime: startTime, // 下载开始时间
      filename: basename(localPath), // 下载的文件名
      status: this.status.downloading.value, // 下载状态: "uploading", "downloading", "interrupted", "completed", "error"
      errorMessage: '',
      transferred: 0, // 已下载大小
      total: -1, // 总共大小
      endTime: -1, // 下载结束时间
    }
    // await this.setItem(id, item) 一开始不存储任务
    this.emit('change', { ...item })
    return item
  },

  async createUploadItem(url, localPath) {
    const filename = decodeURIComponent(new URL(url).pathname.split('/').reverse()[0])
    const startTime = now()
    const total = Fs.statSync(localPath).size
    const id = base64(`${filename}:${startTime}`)
    const item = {
      id: id, // 唯一ID
      url: url, // 上传路径
      connectType: 'upload', // 类型 download upload
      localPath: localPath, // 上传本地文件路径
      startTime: startTime, // 上传开始时间
      filename: filename, // 上传的文件名
      status: this.status.uploading.value, // 传输状态: "downloading", "interrupted", "completed", "error"
      errorMessage: '',
      transferred: 0, // 已上传大小
      total: total, // 总共大小
      endTime: -1, // 下载结束时间
    }
    // await this.setItem(id, item) 一开始不存储任务
    this.emit('change', { ...item })
    return item
  },

  async setItem(id, item) {
    const store = await this.getStore()
    const existedItemIndex = store.data.findIndex((_item) => _item.id === id)
    if (~existedItemIndex) {
      store.data[existedItemIndex] = { ...item }
    } else {
      store.data = prepend(item, store.data)
    }
    return await localforage.setItem(this.storeKey, store)
  },

  async createDownloadTask({ url, headers, localPath }) {
    return new Promise(async (resolve, reject) => {
      const item = await this.createDownloadItem(url, localPath)

      const emitChange = () => {
        this.emit('change', { ...item })
      }

      let percentage = 0
      const calTrans = () => {
        if (item.total > 0) {
          const newPercentage = (item.transferred / item.total).toFixed(2)
          if (percentage !== newPercentage) {
            percentage = newPercentage
            emitChange()
          }
        }
      }

      const throttleChunk = throttle(calTrans, 100)

      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)

      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value)
      })

      xhr.responseType = 'blob'

      xhr.onload = async () => {
        if (xhr.status === 200) {
          const blob = xhr.response
          const buffer = await blob.arrayBuffer()
          Fs.writeFileSync(localPath, Buffer.from(buffer))
          item.transferred = item.total
          item.status = this.status.completed.value
          item.endTime = now()
          await this.setItem(item.id, item)
          emitChange()
          resolve('success')
        } else {
          item.status = this.status.error.value
          item.errorMessage = `HTTP ${xhr.status}`
          await this.setItem(item.id, item)
          emitChange()
          reject(new Error(`HTTP ${xhr.status}`))
        }
      }

      xhr.onerror = async (error) => {
        item.status = this.status.error.value
        item.errorMessage = error && error.message
        await this.setItem(item.id, item)
        emitChange()
        reject(error)
      }

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          item.total = event.total
          item.transferred = event.loaded
          calTrans()
        }
      }

      xhr.send()
    })
  },

  async createUploadTask({ url, headers, localPath }) {
    return new Promise(async (resolve, reject) => {
      const item = await this.createUploadItem(url, localPath)
      const emitChange = () => {
        this.emit('change', { ...item })
      }

      let percentage = 0
      const calTrans = () => {
        const newPercentage = (item.transferred / item.total).toFixed(2)
        if (percentage !== newPercentage) {
          percentage = newPercentage
          emitChange()
        }
      }

      const throttleChunk = throttle(calTrans, 100)

      const xhr = new XMLHttpRequest()
      xhr.open('PUT', url, true)

      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value)
      })

      xhr.upload.onload = async () => {
        if (xhr.status === 200) {
          item.status = this.status.completed.value
          item.endTime = now()
          await this.setItem(item.id, item)
          emitChange()
          resolve('success')
        } else {
          item.status = this.status.error.value
          item.errorMessage = `${xhr.status}`
          await this.setItem(item.id, item)
          emitChange()
          reject(`${xhr.status}`)
        }
      }

      xhr.onerror = async (error) => {
        item.status = this.status.error.value
        item.errorMessage = error && error.message
        await this.setItem(item.id, item)
        emitChange()
        reject(error)
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          item.transferred = event.loaded
          throttleChunk()
        }
      }

      const fileContent = Fs.readFileSync(localPath)
      xhr.send(fileContent)
    })
  },

  async deleteJob({ connectType, id }) {
    const store = await this.getStore()
    store.data = store.data.filter((item) => {
      if (id) {
        return item.id !== id
      }
      if (connectType) {
        return item.connectType !== connectType || item.status !== this.status.completed.value
      }
    })
    return await localforage.setItem(this.storeKey, store)
  },

  async getStore() {
    const data = await localforage.getItem(this.storeKey)
    return data && data.version === this.initStore.version ? data : { ...this.initStore }
  },
}

export default Object.assign(Object.create(EventEmitter.prototype), Job)
