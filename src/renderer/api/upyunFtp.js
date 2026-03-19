import { Client } from 'basic-ftp'

export default {
  setup(bucketName, operatorName, password) {
    if (typeof this.close === 'function') {
      try {
        this.close()
      } catch (err) {}
    }

    const ftpClient = new Client()
    let isReady = false

    const markClosed = () => {
      isReady = false
    }

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

    const setTimeoutMs = timeoutMs => {
      ftpClient.ftp.timeout = timeoutMs
    }

    const closeClient = () => {
      markClosed()
      try {
        ftpClient.close()
      } catch (err) {}
      console.info('--------------- ftp 已关闭 ---------------')
    }

    this.close = () => {
      closeClient()
    }

    const connect = async (timeoutMs = 10000) => {
      if (isReady && !ftpClient.closed) {
        return Promise.resolve()
      }

      setTimeoutMs(timeoutMs)

      return withTimeout(
        ftpClient
          .access({
            host: 'v0.ftp.upyun.com',
            user: `${operatorName}/${bucketName}`,
            password,
          })
          .then(() => {
            isReady = true
            console.info('--------------- ftp 连接成功 ---------------')
          })
          .catch(err => {
            markClosed()
            console.error('FTP 错误:', (err && err.message) || err)
            throw err || new Error('FTP 连接失败')
          }),
        timeoutMs,
        'FTP 连接超时',
      )
    }

    const renamePromise = (oldPath, newPath, timeoutMs = 15000) => {
      setTimeoutMs(timeoutMs)
      return withTimeout(ftpClient.rename(oldPath, newPath), timeoutMs, `FTP 路径修改超时: ${oldPath} => ${newPath}`)
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
