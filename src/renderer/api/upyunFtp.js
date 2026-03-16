import {
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
import Moment from 'moment'
import Ftp from 'ftp'

export default {
  setup(bucketName, operatorName, password) {
    if (typeof this.close === 'function') {
      try {
        this.close()
      } catch (err) {}
    }

    const ftpClient = new Ftp()
    let isReady = false

    ftpClient.on('ready', () => {
      isReady = true
      console.info('--------------- ftp 连接成功 ---------------')
    })
    ftpClient.on('close', () => {
      isReady = false
      console.info('--------------- ftp 已关闭 ---------------')
    })
    ftpClient.on('end', () => {
      isReady = false
    })
    ftpClient.on('error', err => {
      isReady = false
      console.error('FTP 错误:', (err && err.message) || err)
    })

    const withTimeout = (promise, timeoutMs, message) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(message))
        }, timeoutMs)

        promise
          .then(result => {
            clearTimeout(timer)
            resolve(result)
          })
          .catch(err => {
            clearTimeout(timer)
            reject(err)
          })
      })
    }

    const wait = ms => {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    const closeClient = () => {
      isReady = false
      try {
        ftpClient.end()
      } catch (err) {}
    }

    this.close = () => {
      closeClient()
    }

    const connect = async (timeoutMs = 10000) => {
      if (isReady) {
        return Promise.resolve()
      }

      return withTimeout(new Promise((resolve, reject) => {
          const onReady = () => {
            cleanup()
            resolve()
          }
          const onError = err => {
            cleanup()
            reject(err || new Error('FTP 连接失败'))
          }

          const cleanup = () => {
            ftpClient.removeListener('ready', onReady)
            ftpClient.removeListener('error', onError)
          }

          ftpClient.once('ready', onReady)
          ftpClient.once('error', onError)

          try {
            ftpClient.connect({
              host: 'v0.ftp.upyun.com',
              user: `${operatorName}/${bucketName}`,
              password: password,
              keepalive: 10000,
            })
          } catch (err) {
            cleanup()
            reject(err)
          }
        }), timeoutMs, 'FTP 连接超时')
    }

    const renamePromise = (oldPath, newPath, timeoutMs = 15000) => {
      return withTimeout(new Promise((resolve, reject) => {
          ftpClient.rename(oldPath, newPath, err => {
            if (err) return reject(err)
            return resolve()
          })
        }), timeoutMs, `FTP 路径修改超时: ${oldPath} => ${newPath}`)
    }

    this.renameFile = async (oldPath, newPath, options = {}) => {
      const {
        retryTimes = 1,
        connectTimeoutMs = 10000,
        renameTimeoutMs = 15000,
        retryDelayMs = 300,
      } = options

      let lastError = null

      for (let attempt = 0; attempt <= retryTimes; attempt++) {
        try {
          await connect(connectTimeoutMs)
          await renamePromise(oldPath, newPath, renameTimeoutMs)
          console.info('路径修改成功', `${oldPath} => ${newPath}`)
          return Promise.resolve(newPath)
        } catch (err) {
          lastError = err
          closeClient()
          if (attempt < retryTimes) {
            await wait(retryDelayMs)
            continue
          }
        }
      }

      return Promise.reject(lastError)
    }
  },
}
