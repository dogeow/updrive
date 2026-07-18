import localforage from '@/api/storage'
import { remove, prepend } from 'ramda'

import UpyunClient from '@/api/upyunClient'

export default {
  storeKey: 'authHistory',

  initStore: {
    version: 0.1,
    data: [],
  },

  bucketName: '',
  operatorName: '',
  password: '',
  key: '',
  client: Object.create(UpyunClient),

  setup(bucketName, operatorName, password) {
    this.bucketName = bucketName
    this.operatorName = operatorName
    this.password = password
    this.key = `${this.operatorName}/${this.bucketName}`
    this.client.setup(this.bucketName, this.operatorName, this.password)
  },

  save() {
    this.getAuthHistory().then((data) => {
      const authHistory = data
      const record = {
        bucketName: this.bucketName,
        operatorName: this.operatorName,
        password: this.password,
        key: this.key,
        lastModified: Math.floor(Date.now() / 1000),
        remark: '',
      }
      const recordIndex = authHistory.data.findIndex((u) => u.key === this.key)
      if (~recordIndex) {
        authHistory[recordIndex] = { ...record }
      } else {
        authHistory.data = prepend(record, authHistory.data)
      }

      return localforage.setItem(this.storeKey, authHistory)
    })
  },

  getAuthHistory() {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('storage timeout')), 5000)
    })

    return Promise.race([
      localforage.getItem(this.storeKey),
      timeout,
    ]).then((data) => {
      return data && data.version === this.initStore.version ? data : { ...this.initStore }
    })
  },

  deleteAuthHistory(key) {
    return this.getAuthHistory().then((data) => {
      const authHistory = data
      authHistory.data = authHistory.data.filter((u) => u.key !== key)
      return localforage.setItem(this.storeKey, authHistory)
    })
  },
}
