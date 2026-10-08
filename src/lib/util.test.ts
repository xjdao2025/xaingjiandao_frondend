import { expect, it } from 'vitest'

import { RequestError } from './http'
import { requestIdFor, sendErrorMessage } from './util'

it('reuses the retry id whenever the same content comes back, so 10 → 20 → 10 cannot charge 10 twice', () => {
  const ids = new Map<string, string>()
  const ten = requestIdFor(ids, '10')
  const twenty = requestIdFor(ids, '20')
  expect(twenty).not.toBe(ten)
  expect(requestIdFor(ids, '10')).toBe(ten)
})

it('warns that a send may have gone through unless the server refused it', () => {
  expect(sendErrorMessage(new RequestError('稻米不足', 422, ''), 'x')).toBe('稻米不足')
  expect(sendErrorMessage(new Error('请求超时，请稍后重试。'), 'x')).toContain('可能已经送出')
  expect(sendErrorMessage(new RequestError('服务暂时不可用', 503, ''), 'x')).toContain('可能已经送出')
})
