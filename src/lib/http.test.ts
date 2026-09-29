import { afterEach, describe, expect, it, vi } from 'vitest'

import { readJson, requestJson } from './http'

afterEach(() => vi.unstubAllGlobals())

describe('HTTP error mapping', () => {
  it.each(['', '<html>unexpected gateway page</html>', 'null'])(
    'rejects malformed successful JSON instead of returning an empty object: %s',
    async (body) => {
      await expect(readJson(new Response(body, { status: 200 })))
        .rejects.toThrow('服务返回的数据不完整')
    },
  )

  it('accepts an intentional empty 204 response', async () => {
    await expect(readJson(new Response(null, { status: 204 }))).resolves.toEqual({})
  })

  it('does not expose low-level fetch errors to the interface', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

    await expect(requestJson('http://backend.test')).rejects.toThrow(
      '网络连接失败，请检查网络后重试。',
    )
  })

  it('maps a rejected login to the backend credential error rather than session expiry', async () => {
    const response = Response.json({ error: 'InvalidCredentials' }, { status: 401 })

    await expect(readJson(response)).rejects.toThrow('账号或密码错误')
  })

  it('preserves the login error detail from servers without machine codes', async () => {
    const response = Response.json({ errors: { detail: '账号或密码错误' } }, { status: 401 })

    await expect(readJson(response)).rejects.toThrow('账号或密码错误')
  })

  it.each(['ExpiredToken', 'JwtExpired'])('recognizes actual expired session code %s', async (error) => {
    await expect(readJson(Response.json({ error }, { status: 401 }))).rejects.toThrow(
      '登录状态已过期，请重新登录。',
    )
  })

  it('does not claim an unidentified 401 means an expired session', async () => {
    await expect(readJson(Response.json({}, { status: 401 }))).rejects.toThrow('请先登录后再试。')
  })

  it('distinguishes unavailable login service from incorrect credentials', async () => {
    await expect(readJson(Response.json({ error: 'LoginUnavailable' }, { status: 503 })))
      .rejects.toThrow('登录服务暂时不可用，请稍后重试。')
  })

  it('retains backend validation messages', async () => {
    await expect(readJson(Response.json({ errors: { title: ['请填写标题'] } }, { status: 422 })))
      .rejects.toThrow('请填写标题')
  })
})
