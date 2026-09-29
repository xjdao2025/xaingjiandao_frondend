import { afterEach, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  send: vi.fn(), values: [] as unknown[], index: 0,
  effects: [] as Array<{ deps: unknown[]; cleanup?: () => void }>,
  pending: [] as Array<() => void>,
}))
vi.mock('./api', async (original) => ({ ...await original<typeof import('./api')>(), sendVerificationCode: mock.send }))
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const i = mock.index++
    if (!(i in mock.values)) mock.values[i] = initial
    return [mock.values[i], (value: unknown) => { mock.values[i] = value }]
  },
  useRef: (initial: unknown) => {
    const i = mock.index++
    return mock.values[i] ?? (mock.values[i] = { current: initial })
  },
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
    const i = mock.index++
    if (mock.effects[i]?.deps.every((dep, j) => Object.is(dep, deps[j]))) return
    mock.pending.push(() => {
      mock.effects[i]?.cleanup?.()
      mock.effects[i] = { deps, cleanup: effect() || undefined }
    })
  },
}))

import { VerificationCodeButton } from './VerificationCodeButton'
import { requestVerificationCode } from './api'

function unmount() {
  mock.effects.forEach((effect) => effect?.cleanup?.())
  mock.effects = []; mock.values = []; mock.pending = []
}
afterEach(() => { unmount(); mock.send.mockReset(); vi.useRealTimers(); vi.unstubAllGlobals() })

it('blocks duplicate sends, restores countdown after remount, expires by wall time, and handles server throttling and failures', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-21T00:00:00Z'))
  vi.stubGlobal('window', globalThis)
  const stored = new Map<string, string>()
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => stored.get(key), setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) })
  const onSent = vi.fn(), onError = vi.fn()
  const render = (contact = '13800000000') => {
    const props = { channel: 'sms' as const, contact, purpose: 'register' as const, onError, onSent }
    for (let i = 0; i < 10; i++) {
      mock.index = 0
      const view = VerificationCodeButton(props)
      if (!mock.pending.length) return view.props
      mock.pending.splice(0).forEach((effect) => effect())
    }
    throw new Error('Effects did not settle')
  }
  let finish!: (value: { sent: boolean; retryAfter: number }) => void
  mock.send.mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
  const before = render()
  const sending = before.clickAction!()
  await before.clickAction!()
  expect(mock.send).toHaveBeenCalledTimes(1)
  expect(render().isDisabled).toBe(true)
  finish({ sent: true, retryAfter: 60 }); await sending
  expect(render().label).toBe('60 秒后重发')
  await render().clickAction!()
  expect(mock.send).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(21_000)
  unmount()
  expect(render().label).toBe('39 秒后重发')
  expect(render('13900000000').isDisabled).toBe(false)
  expect(render().label).toBe('39 秒后重发')
  vi.advanceTimersByTime(39_000)
  expect(render().isDisabled).toBe(false)
  mock.send.mockResolvedValueOnce({ sent: false, retryAfter: 12 })
  await render().clickAction!()
  expect(render().label).toBe('12 秒后重发')
  expect(onSent).toHaveBeenCalledTimes(1)
  expect(onError).toHaveBeenLastCalledWith('发送太频繁，请 12 秒后重试。')
  vi.advanceTimersByTime(12_000)
  mock.send.mockRejectedValueOnce(new Error('短信发送失败'))
  await render().clickAction!()
  expect(render().isDisabled).toBe(false)
  expect(onError).toHaveBeenLastCalledWith('短信发送失败')

  mock.send.mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
  const late = render().clickAction!()
  stored.set('xiangjian.verification:sms:86:13900000000', String(Date.now() + 20_000))
  expect(render('13900000000').isDisabled).toBe(true)
  finish({ sent: true, retryAfter: 60 }); await late
  expect(render('13900000000').label).toBe('20 秒后重发')
  expect(onSent).toHaveBeenCalledTimes(1)
  expect(render().label).toBe('60 秒后重发')
})

it('forwards backend cooldown for success and 429 while preserving delivery failures', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 204, headers: { 'Retry-After': '60' } }))
    .mockResolvedValueOnce(Response.json({ errors: { detail: '发送太频繁' } }, { status: 429, headers: { 'Retry-After': '17' } }))
    .mockResolvedValueOnce(Response.json({ errors: { detail: '验证码发送失败' } }, { status: 502 }))
    .mockResolvedValueOnce(new Response(null, { status: 204, headers: { 'Retry-After': '60' } }))
  vi.stubGlobal('fetch', fetch)
  const data = { channel: 'sms' as const, phone: ' 13800000000 ', purpose: 'register' as const }
  await expect(requestVerificationCode(data)).resolves.toEqual({ sent: true, retryAfter: 60 })
  await expect(requestVerificationCode(data)).resolves.toEqual({ sent: false, retryAfter: 17 })
  await expect(requestVerificationCode(data)).rejects.toThrow('验证码发送失败')
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ channel: 'sms', phone: '13800000000', phone_region: '86', purpose: 'register' })
  await expect(requestVerificationCode({ channel: 'email', email: ' Alice@Example.COM ', purpose: 'register' })).resolves.toEqual({ sent: true, retryAfter: 60 })
  expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ channel: 'email', email: 'alice@example.com', purpose: 'register' })
})
