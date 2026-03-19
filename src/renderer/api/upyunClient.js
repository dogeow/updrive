import {
  tail,
  head,
  pipe,
  uniq,
  range,
  path,
  split,
  map,
  zipObj,
  compose,
  objOf,
  ifElse,
  isEmpty,
  assoc,
  replace,
  converge,
  always,
  prop,
  concat,
  identity,
  __,
  equals,
} from 'ramda'
import { readFileSync, createReadStream, createWriteStream, readdirSync, statSync, mkdirSync, existsSync } from 'fs'
import Path from 'path'
import mime from 'mime'
import axios from 'axios'

import { mandatory, base64, md5sum, sleep, isDir, getLocalName, getAuthorizationHeader } from '@/api/tool'
import UpyunFtp from '@/api/upyunFtp'

export default {
  bucketName: '',
  operatorName: '',
  passwordMd5: '',
  ftp: Object.create(UpyunFtp),

  setup(bucketName, operatorName, password) {
    this.bucketName = bucketName
    this.operatorName = operatorName
    this.passwordMd5 = md5sum(password)
    this.ftp.setup(bucketName, operatorName, password)
  },

  // // fetch 请求获取不了自定义响应头
  // requestWithFetch(input, config = {}, responseHandle = response => response) {
  //   const url = this.getUrl(input)
  //   config.headers = { ...config.headers, ...this.getHeaders(url, config.method) }
  //   return window
  //     .fetch(url, config)
  //     .then(res => res.text())
  //     .then(responseHandle)
  // },

  request(input, config = {}, responseHandle = (response) => response.data) {
    const url = this.getUrl(input)
    config.url = url
    config.headers = { ...config.headers, ...this.getHeaders(url, config.method) }
    return axios({
      responseType: 'text',
      ...config,
    }).then(responseHandle)
  },

  getUrl(input) {
    const uri = typeof input === 'object' ? input.uri : input
    const search = typeof input === 'object' ? input.search : ''
    const urlObject = new URL(`${this.bucketName}${uri}`, `https://v0.api.upyun.com`)
    if (search) urlObject.search = search
    return urlObject.href
  },

  getHeaders(url, method = 'GET') {
    return {
      ...getAuthorizationHeader({
        passwordMd5: this.passwordMd5,
        operatorName: this.operatorName,
        method: method,
        url,
      }),
    }
  },

  makeRequestOpts({ search = '', uri = '', method, headers = {} } = {}) {
    const url = this.getUrl(uri, { search })

    const _headers = { ...headers, ...this.getHeaders(url, method) }

    return {
      method,
      url,
      headers: _headers,
    }
  },

  // 遍历目录
  async traverseDir(uris = '', opts = {}) {
    let files = []
    // 递归遍历目录
    const parseDir = async (paths, fromPath = '') => {
      for (const _path of paths) {
        try {
          if (isDir(_path)) {
            files.push({
              absolutePath: _path,
              relativePath: fromPath + Path.basename(_path) + '/',
            })
            const dirData = await this.getListDirInfo(_path)
            if (dirData && dirData.data && dirData.data.length)
              await parseDir(
                dirData.data.map((fileObj) => fileObj.uri),
                fromPath + Path.basename(_path) + '/',
              )
          } else {
            files.push({
              absolutePath: _path,
              relativePath: fromPath + Path.basename(_path),
            })
          }
        } catch (err) {
          console.error(err)
        }
      }
    }

    await parseDir(uris)

    // 文件顺序
    if (opts.reverse === true) {
      files = files.reverse()
    }

    if (opts.type === 'file') {
      files = files.filter((f) => !isDir(f.absolutePath))
    }

    if (opts.type === 'folder') {
      files = files.filter((f) => isDir(f.absolutePath))
    }

    if (opts.relative !== true) {
      files = files.map((o) => o.absolutePath)
    }

    return files
  },

  // HEAD 请求
  async head(uri) {
    return this.request(uri, { method: 'HEAD' }, (response) => response.headers)
  },

  // GET 请求
  async get(uri) {
    return this.request(uri, { method: 'GET' })
  },

  // 授权认证
  async checkAuth() {
    return this.request({ search: '?usage', uri: '/' })
  },

  // 获取使用量
  async getUsage() {
    return this.request({ search: '?usage', uri: '/' })
  },

  // 获取目录列表信息
  async getListDirInfo(uri = '/', requestConfig = {}) {
    return this.request(uri, { method: 'GET', ...requestConfig }).then(
      compose(
        assoc('path', uri),
        ifElse(
          isEmpty,
          () => ({ data: [] }),
          compose(
            objOf('data'),
            compose(
              map((obj) => {
                obj.filetype = obj.folderType === 'F' ? '' : mime.getType(obj.filename)
                obj.uri = uri + obj.filename + (obj.folderType === 'F' ? '/' : '')
                return obj
              }),
              map(compose(zipObj(['filename', 'folderType', 'size', 'lastModified']), split(/\t/))),
              split(/\n/),
            ),
          ),
        ),
      ),
    )
  },

  // 创建目录
  async createFolder(location = '', folderName = '') {
    return this.request(`${location}${folderName}/`, { method: 'POST', headers: { folder: true } })
  },

  // 上传文件
  async uploadFiles(uri, localFilePaths = [], jobObj) {
    const results = []

    // 上传单个文件
    const uploadFile = async (uploadLocation, localFilePath) => {
      const localFileStat = statSync(localFilePath)
      const basename = Path.basename(localFilePath)
      if (!localFileStat.isFile()) return Promise.resolve(this.createFolder(uploadLocation, basename))
      const url = this.getUrl(uploadLocation + basename)
      const headers = { ...this.getHeaders(url, 'PUT') }
      return await jobObj.createUploadTask({
        url: url,
        headers: headers,
        localPath: localFilePath,
      })
    }

    // 广度优先遍历
    const uploadList = []
    let list = localFilePaths.slice().map((path) => ({ localFilePath: path, relativePath: '' }))

    while (list.length) {
      const node = list.shift()
      const { localFilePath, relativePath } = node
      if (statSync(localFilePath).isDirectory() && readdirSync(localFilePath).length) {
        list = list.concat(
          readdirSync(localFilePath).map((name) => ({
            localFilePath: Path.join(localFilePath, name),
            relativePath: relativePath + Path.basename(localFilePath) + '/',
          })),
        )
      } else {
        uploadList.push(node)
      }
    }

    for (const pathObj of uploadList) {
      const uploadLocation = uri + pathObj.relativePath
      try {
        results.push({
          result: true,
          location: uploadLocation,
          localPath: pathObj.localFilePath,
          message: await uploadFile(uploadLocation, pathObj.localFilePath),
        })
      } catch (err) {
        console.error(err)
        results.push({
          result: false,
          location: uploadLocation,
          localPath: pathObj.localFilePath,
          message: err && err.message,
        })
      }
    }

    return results
  },

  // 删除文件
  async deleteFiles(uris) {
    const results = []
    const waitDeleteInit = await this.traverseDir(uris, { reverse: true })

    for (const uri of waitDeleteInit) {
      try {
        results.push({
          uri: uri,
          result: true,
          message: await this.request(uri, { method: 'DELETE' }),
        })
      } catch (err) {
        results.push({
          uri: uri,
          result: false,
          message: err && err.message,
        })
      }
    }

    return results
  },

  // 下载文件
  async downloadFiles(destPath, uris, jobObj) {
    // 下载单个文件
    const downloadFile = async (localPath, uri) => {
      if (!uri && !existsSync(localPath)) return Promise.resolve(mkdirSync(localPath))
      const url = this.getUrl(uri)
      const headers = { ...this.getHeaders(url, 'GET') }
      return await jobObj.createDownloadTask({
        url: url,
        headers: headers,
        localPath: localPath,
      })
    }

    const results = []

    const dir = await this.traverseDir(uris, { relative: true })
    const dirAll = dir.map((pathObj) => {
      return {
        uri: isDir(pathObj.absolutePath) ? '' : pathObj.absolutePath,
        localPath: Path.join(
          getLocalName(Path.join(destPath, pipe(prop('relativePath'), split('/'), head)(pathObj))),
          ...pipe(prop('relativePath'), split('/'), tail)(pathObj),
        ),
      }
    })

    for (const pathObj of dirAll) {
      try {
        results.push({
          uri: pathObj.uri,
          localPath: pathObj.localPath,
          result: true,
          message: await downloadFile(pathObj.localPath, pathObj.uri),
        })
      } catch (err) {
        results.push({
          uri: pathObj.uri,
          localPath: pathObj.localPath,
          result: false,
          message: err && err.message,
        })
      }
    }

    return results
  },

  // 重命名文件
  async renameFile(oldPath, newPath) {
    await this.ftp.renameFile(oldPath, newPath)
  },

  // 移动文件到指定目录
  async moveFile(sourcePath, targetFolderPath) {
    // 提取文件名
    const parts = sourcePath.split('/')
    const fileName = parts[parts.length - 1]
    const targetPath = targetFolderPath + fileName

    // 使用 renameFile 来移动文件
    await this.renameFile(sourcePath, targetPath)
    return {
      success: true,
      sourcePath,
      targetPath,
    }
  },

  // 获取文件夹内的前几张图片作为封面
  async getFolderCover(folderUri, limit = 4) {
    const result = await this.getListDirInfo(folderUri)
    const files = (result && result.data) || []

    // 筛选图片文件
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
    const imageFiles = files
      .filter((file) => {
        if (file.folderType === 'F') return false
        const ext = file.filename.split('.').pop().toLowerCase()
        return imageExtensions.includes(ext)
      })
      .slice(0, limit)

    return imageFiles
  },

  // 规范目录路径
  normalizeFolderPath(path = '') {
    const withLeadingSlash = path.startsWith('/') ? path : `/${path}`
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
  },

  // 确保远程目录存在（递归创建）
  async ensureRemoteFolder(folderPath, results) {
    const normalizedPath = this.normalizeFolderPath(folderPath)
    const segments = normalizedPath.split('/').filter(Boolean)
    let current = '/'

    for (const segment of segments) {
      const next = `${current}${segment}/`
      try {
        await this.createFolder(current, segment)
        if (results && !results.createdFolders.includes(next)) {
          results.createdFolders.push(next)
        }
      } catch (err) {}
      current = next
    }
  },

  // 重命名目录：优先使用原生重命名，不支持时降级为递归搬迁
  async renameFolder(oldPath, newPath) {
    const sourcePath = this.normalizeFolderPath(oldPath)
    const targetPath = this.normalizeFolderPath(newPath)

    if (sourcePath === targetPath) {
      return {
        success: true,
        createdFolders: [],
        movedFiles: [],
        deletedFolders: [],
        errors: [],
      }
    }

    try {
      await this.ftp.renameFile(sourcePath, targetPath, {
        retryTimes: 0,
        connectTimeoutMs: 5000,
        renameTimeoutMs: 2000,
      })
      return {
        success: true,
        createdFolders: [],
        movedFiles: [{ type: 'folder', source: sourcePath, target: targetPath }],
        deletedFolders: [sourcePath],
        errors: [],
      }
    } catch (err) {
      return await this.moveFolder(sourcePath, targetPath)
    }
  },

  // 移动/重命名目录（曲线救国方案）
  async moveFolder(sourcePath, targetPath) {
    const results = {
      success: true,
      createdFolders: [],
      movedFiles: [],
      deletedFolders: [],
      errors: [],
    }

    try {
      const srcDir = this.normalizeFolderPath(sourcePath)
      const tgtDir = this.normalizeFolderPath(targetPath)

      if (srcDir === '/') {
        throw new Error('不支持移动根目录')
      }

      if (srcDir === tgtDir) {
        return results
      }

      if (tgtDir.startsWith(srcDir)) {
        throw new Error('目标目录不能在源目录内部')
      }

      await this.ensureRemoteFolder(tgtDir, results)

      const sourceList = await this.getListDirInfo(srcDir, { timeout: 15000 })
      const sourceItems = (sourceList && sourceList.data) || []

      for (const item of sourceItems) {
        const sourceUri = item.uri
        const targetUri = tgtDir + item.filename + (item.folderType === 'F' ? '/' : '')

        if (item.folderType === 'F') {
          const childResult = await this.moveFolder(sourceUri, targetUri)
          results.createdFolders = results.createdFolders.concat(childResult.createdFolders)
          results.movedFiles = results.movedFiles.concat(childResult.movedFiles)
          results.deletedFolders = results.deletedFolders.concat(childResult.deletedFolders)
          results.errors = results.errors.concat(childResult.errors)
          if (!childResult.success) {
            results.success = false
          }
          continue
        }

        try {
          await this.ftp.renameFile(sourceUri, targetUri)
          results.movedFiles.push({ type: 'file', source: sourceUri, target: targetUri })
        } catch (err) {
          results.success = false
          results.errors.push({ item: sourceUri, error: err.message })
        }
      }

      if (results.errors.length) {
        results.success = false
        return results
      }

      try {
        await this.request(srcDir, { method: 'DELETE', timeout: 15000 })
        results.deletedFolders.push(srcDir)
      } catch (err) {
        results.success = false
        results.errors.push({ item: srcDir, error: err.message })
      }

      return results
    } catch (err) {
      results.success = false
      results.errors.push({ item: sourcePath, error: err.message })
      return results
    }
  },
}
