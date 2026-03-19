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

      return ftpClient
        .connect('v0.ftp.upyun.com', 21)
        .then(() => ftpClient.login(`${operatorName}/${bucketName}`, password))
        .then(() => {
          isReady = true
          console.info('--------------- ftp 连接成功 ---------------')
        })
        .catch(err => {
          markClosed()
          console.error('FTP 错误:', (err && err.message) || err)
          throw err || new Error('FTP 连接失败')
        })
    }

    const renamePromise = (oldPath, newPath, timeoutMs = 15000) => {
      setTimeoutMs(timeoutMs)
      return ftpClient.rename(oldPath, newPath)
    }

    this.renameFile = async (oldPath, newPath, options = {}) => {
      const {
        retryTimes = 1,
        connectTimeoutMs = 20000,
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
          if (!ftpClient.closed) {
            closeClient()
          } else {
            markClosed()
          }
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
