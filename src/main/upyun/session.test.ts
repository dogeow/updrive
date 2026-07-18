import { describe, expect, it } from 'vitest'
import { UpyunSession } from './session'

describe('UpyunSession path helpers', () => {
  const session = new UpyunSession({
    bucketName: 'demo',
    operatorName: 'op',
    password: 'secret',
  })

  it('normalizes folder paths', () => {
    expect(session.normalizeFolderPath('docs')).toBe('/docs/')
    expect(session.normalizeFolderPath('/docs')).toBe('/docs/')
    expect(session.normalizeFolderPath('/docs/')).toBe('/docs/')
  })

  it('joins remote files', () => {
    expect(session.joinRemoteFile('/docs/', 'a.txt')).toBe('/docs/a.txt')
  })
})
