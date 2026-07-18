import crypto from 'node:crypto'
import path from 'node:path'
import { Client as FtpClient } from 'basic-ftp'
import { createWriteStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const API_ORIGIN = 'https://v0.api.upyun.com'

const isDir = (value = ''): boolean => value.endsWith('/')

const md5sum = (value: string): string => crypto.createHash('md5').update(value, 'utf8').digest('hex')

const hmacSha1 = (secret: string, value: string): string =>
  crypto.createHmac('sha1', secret).update(value, 'utf8').digest('base64')

const splitListLine = (line = '') => {
  const [filename = '', folderType = '', size = '0', lastModified = '0'] = line.split('\t')
  return { filename, folderType, size: Number(size), lastModified: Number(lastModified) }
}

const buildFileType = (filename = '', folderType = ''): string => {
  if (folderType === 'F') return ''
  const extension = path.extname(filename).replace(/^\./, '')
  return extension.toLowerCase()
}

export interface UpyunCredentials {
  bucketName: string
  operatorName: string
  password: string
}

export class UpyunSession {
  bucketName: string
  operatorName: string
  password: string
  passwordMd5: string
  ftp: FtpClient
  ftpReady: boolean

  constructor({ bucketName, operatorName, password }: UpyunCredentials) {
    this.bucketName = bucketName
    this.operatorName = operatorName
    this.password = password
    this.passwordMd5 = md5sum(password)
    this.ftp = new FtpClient()
    this.ftpReady = false
  }

  close(): void {
    this.ftpReady = false
    try {
      this.ftp.close()
    } catch {
      // ignore
    }
  }

  getUrl(input: string | { uri: string; search?: string }): URL {
    const uri = typeof input === 'object' ? input.uri : input
    const search = typeof input === 'object' ? input.search : ''
    const target = new URL(`${this.bucketName}${uri}`, API_ORIGIN)
    if (search) {
      target.search = search
    }
    return target
  }

  getHeaders(url: string, method = 'GET'): Record<string, string> {
    const date = new Date().toUTCString()
    return {
      Authorization: `UPYUN ${this.operatorName}:${hmacSha1(
        this.passwordMd5,
        [method.toUpperCase(), new URL(url).pathname, date].join('&'),
      )}`,
      'x-date': date,
    }
  }

  async requestRaw(input: string | { uri: string; search?: string }, options: RequestInit = {}): Promise<Response> {
    const target = this.getUrl(input)
    const method = options.method || 'GET'
    const headers = {
      ...this.getHeaders(target.href, method as string),
      ...(options.headers as Record<string, string> | undefined),
    }

    const response = await fetch(target, {
      ...options,
      method,
      headers,
    })

    if (!response.ok) {
      const message = (await response.text().catch(() => '')) || response.statusText
      const error = new Error(message || `HTTP ${response.status}`) as Error & { status?: number }
      error.status = response.status
      throw error
    }

    return response
  }

  async requestText(input: string | { uri: string; search?: string }, options: RequestInit = {}): Promise<string> {
    const response = await this.requestRaw(input, options)
    return response.text()
  }

  async checkAuth(): Promise<string> {
    return this.requestText({ uri: '/', search: '?usage' })
  }

  async getUsage(): Promise<number> {
    const usage = await this.requestText({ uri: '/', search: '?usage' })
    return Number(usage || 0)
  }

  normalizeFolderPath(value = '/'): string {
    const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
  }

  joinRemoteFile(folderPath = '/', filename = ''): string {
    return `${this.normalizeFolderPath(folderPath)}${filename}`
  }

  parseDirList(content = '', uri = '/') {
    const rows = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map(splitListLine)
      .map((entry) => ({
        ...entry,
        filetype: buildFileType(entry.filename, entry.folderType),
        uri: this.joinRemoteFile(uri, `${entry.filename}${entry.folderType === 'F' ? '/' : ''}`),
      }))

    return { path: uri, data: rows }
  }

  async getListDirInfo(uri = '/') {
    const folderPath = this.normalizeFolderPath(uri)
    const content = await this.requestText(folderPath, { method: 'GET' })
    return this.parseDirList(content, folderPath)
  }

  async createFolder(location = '/', folderName = ''): Promise<string> {
    const remotePath = this.joinRemoteFile(location, `${folderName}/`)
    return this.requestText(remotePath, {
      method: 'POST',
      headers: {
        folder: 'true',
      },
    })
  }

  async uploadLocalFile(folderPath: string, localPath: string): Promise<void> {
    const filename = path.basename(localPath)
    const buffer = await readFile(localPath)
    const remotePath = this.joinRemoteFile(folderPath, filename)
    await this.requestText(remotePath, {
      method: 'PUT',
      headers: {
        'content-type': 'application/octet-stream',
      },
      body: buffer,
    })
  }

  async downloadToLocal(remoteUri: string, localPath: string): Promise<void> {
    const response = await this.requestRaw(remoteUri, { method: 'GET' })
    if (!response.body) {
      throw new Error('Empty response body')
    }
    const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream)
    await pipeline(nodeStream, createWriteStream(localPath))
  }

  async traverseDir(uris: string[] = [], options: { reverse?: boolean; type?: 'file' | 'folder' } = {}) {
    const input = Array.isArray(uris) ? uris : [uris]
    let results: string[] = []

    const visit = async (paths: string[]): Promise<void> => {
      for (const current of paths) {
        if (isDir(current)) {
          results.push(current)
          const listing = await this.getListDirInfo(current)
          if (listing.data.length) {
            await visit(listing.data.map((entry) => entry.uri))
          }
        } else {
          results.push(current)
        }
      }
    }

    await visit(input)

    if (options.reverse) {
      results = results.reverse()
    }

    if (options.type === 'file') {
      results = results.filter((entry) => !isDir(entry))
    }

    if (options.type === 'folder') {
      results = results.filter((entry) => isDir(entry))
    }

    return results
  }

  async deleteFiles(paths: string[] = []) {
    const targets = await this.traverseDir(paths, { reverse: true })
    const results: { uri: string; result: boolean; message?: string }[] = []

    for (const target of targets) {
      try {
        await this.requestText(target, { method: 'DELETE' })
        results.push({ uri: target, result: true })
      } catch (error) {
        results.push({
          uri: target,
          result: false,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return results
  }

  async connectFtp(timeoutMs = 10000): Promise<void> {
    if (this.ftpReady && !this.ftp.closed) {
      return
    }

    this.ftp.ftp.timeout = timeoutMs
    await this.ftp.connect('v0.ftp.upyun.com', 21)
    await this.ftp.login(`${this.operatorName}/${this.bucketName}`, this.password)
    this.ftpReady = true
  }

  async renameFile(oldPath: string, newPath: string): Promise<string> {
    await this.connectFtp(20000)
    this.ftp.ftp.timeout = 15000
    await this.ftp.rename(oldPath, newPath)
    return newPath
  }
}
