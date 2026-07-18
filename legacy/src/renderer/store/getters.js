import { path, last } from 'ramda'

import { externalUrls as __externalUrls } from '@/api/tool'

export const bucketName = (state, getters) => {
  return path(['auth', 'user', 'bucketName'])(state) || ''
}

export const baseHref = (state, getters) => {
  const configuredDomain = path(['profile', 'data', 'domain'])(state) || ''
  if (configuredDomain) return configuredDomain
  return getters.bucketName ? `http://${getters.bucketName}.test.upcdn.net` : ''
}

export const externalUrls = (state, getters) => {
  return {
    domain: `https://console.upyun.com/services/${getters.bucketName}/domainsFile/`,
    createBucket: `https://console.upyun.com/services/create/file/`,
    ...__externalUrls,
  }
}

// upyunClient 对象
export const upyunClient = state => {
  return path(['auth', 'user', 'client'], state) || null
}

// 获取文件访问 url（优先加速域名，默认测试域名）
export const getUpyunApiUrl = (state, getters) => uri => {
  const configuredDomain = getters.baseHref
  const fallbackDomain = getters.bucketName ? `http://${getters.bucketName}.test.upcdn.net` : 'https://v0.api.upyun.com'
  const domain = configuredDomain || fallbackDomain
  try {
    return new URL(uri, domain).href
  } catch (error) {
    return getters.upyunClient ? getters.upyunClient.getUrl(uri) : uri
  }
}

// job 对象
export const job = state => {
  return path(['task', 'job'], state) || null
}

// profile handler 对象
export const profile = state => {
  return path(['profile', 'handler'], state) || null
}
