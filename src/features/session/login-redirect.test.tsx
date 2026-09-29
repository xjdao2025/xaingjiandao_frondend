import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode, RefObject } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  href: '/login',
  navigate: vi.fn(),
  saveSession: vi.fn(),
  submit: undefined as (() => Promise<void>) | undefined,
}))
vi.mock('@tanstack/react-router', async (original) => ({
  ...await original<typeof import('@tanstack/react-router')>(),
  Link: ({ children, to, search }: { children: ReactNode; to: string; search?: { returnTo: string } }) =>
    <a href={to + (search ? `?${new URLSearchParams(search)}` : '')}>{children}</a>,
  useNavigate: () => state.navigate,
  useRouterState: ({ select }: { select: (value: { location: { href: string } }) => unknown }) => select({ location: { href: state.href } }),
}))
vi.mock('@astryxdesign/core/TextInput', () => ({ TextInput: ({ ref, type }: { ref: RefObject<HTMLInputElement | null>; type?: string }) => {
  ref.current = { value: type === 'password' ? 'test-password' : 'member.test' } as HTMLInputElement
  return null
} }))
vi.mock('@astryxdesign/core/Button', () => ({ Button: ({ clickAction }: { clickAction: () => Promise<void> }) => { state.submit = clickAction; return null } }))
vi.mock('./session', () => ({ useStoredSession: () => ({ saveSession: state.saveSession }) }))
vi.mock('./api', () => ({ loginRice: vi.fn().mockResolvedValue({ token: 'test-token' }) }))

import { LoginLink } from './LoginLink'
import { LoginPage } from './LoginPage'
import { loginReturnTo } from './login-redirect'

beforeEach(() => { state.href = '/login'; vi.clearAllMocks() })

it('carries the original notification address through the login link and successful login', async () => {
  const destination = '/notifications?filter=unread#message-7'
  state.href = destination
  const html = renderToStaticMarkup(<LoginLink>前往登录</LoginLink>)
  expect(html).toContain(new URLSearchParams({ returnTo: destination }).toString())
  state.href = '/login'
  renderToStaticMarkup(<LoginPage returnTo={destination} />)
  await state.submit!()
  expect(state.saveSession).toHaveBeenCalledOnce()
  expect(state.navigate).toHaveBeenCalledWith({ href: destination, replace: true })
})

it('keeps an embedded login on the requested personal page', async () => {
  state.href = '/me/tasks'
  renderToStaticMarkup(<LoginPage />)
  await state.submit!()
  expect(state.navigate).toHaveBeenCalledWith({ href: '/me/tasks', replace: true })
})

it('returns from a guest detail login to that exact task or event instead of its background list', async () => {
  for (const destination of ['/tasks/task-7', '/events/event-9']) {
    state.href = '/search'
    const html = renderToStaticMarkup(<LoginLink returnTo={destination}>登录后申请</LoginLink>)
    expect(html).toContain(new URLSearchParams({ returnTo: destination }).toString())
    state.href = '/login'
    renderToStaticMarkup(<LoginPage returnTo={destination} />)
    await state.submit!()
    expect(state.navigate).toHaveBeenLastCalledWith({ href: destination, replace: true })
  }
})

it.each([undefined, 'https://other.test', '//other.test', '/\\other.test', '/\n/other.test', 'javascript:alert(1)', '/login?returnTo=/login'])(
  'rejects unsafe or looping return addresses: %s', (value) => {
    expect(loginReturnTo(value)).toBe('/')
  },
)
