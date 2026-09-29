import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RiceSession } from '~/lib/models'

const state = vi.hoisted(() => ({ session: null as RiceSession | null, pathname: '/', resolvedPathname: '', isLoading: false, isReady: true }))
vi.mock('~/features/session/session', () => ({ useStoredSession: () => ({ session: state.session, isReady: state.isReady, saveSession: vi.fn() }) }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className, 'aria-label': label }: { children: ReactNode; to: string; className?: string; 'aria-label'?: string }) => <a href={to} className={className} aria-label={label}>{children}</a>,
  useNavigate: () => vi.fn(),
  useCanGoBack: () => false,
  useBlocker: vi.fn(),
  useRouter: () => ({ invalidate: vi.fn(), history: { back: vi.fn() }, navigate: vi.fn() }),
  useRouterState: ({ select }: { select: (state: { location: { pathname: string; href: string }; resolvedLocation: { pathname: string; href: string }; isLoading: boolean }) => unknown }) => select({ location: { pathname: state.pathname, href: state.pathname }, resolvedLocation: { pathname: state.resolvedPathname || state.pathname, href: state.resolvedPathname || state.pathname }, isLoading: state.isLoading }),
}))
vi.mock('~/features/notifications/api', () => ({ getNotifications: vi.fn(), getTaskNotifications: vi.fn(), NOTIFICATIONS_READ_EVENT: 'read' }))
vi.mock('~/features/notifications/NotificationsPage', () => ({ NotificationsPage: () => null }))
vi.mock('~/features/feed/ComposePanel', () => ({ ComposePanel: () => null }))
vi.mock('~/features/feed/api', () => ({ clearCachedFeed: vi.fn(), deletePost: vi.fn(), hideDeletedPost: vi.fn(), toggleLike: vi.fn(), toggleRepost: vi.fn() }))

import { AppShell } from './AppShell'

beforeEach(() => { state.session = null; state.pathname = '/'; state.resolvedPathname = ''; state.isLoading = false; state.isReady = true })

describe('guest access', () => {
  it('does not flash guest controls or mount content before session restoration', () => {
    state.isReady = false
    const html = renderToStaticMarkup(<AppShell><p>content</p></AppShell>)
    expect(html).not.toContain('href="/login"')
    expect(html).not.toContain('<p>content</p>')
    expect(html).toContain('正在恢复登录状态')
  })

  it('keeps the shared brand and current navigation selected while the next route loads', () => {
    state.pathname = '/events'; state.resolvedPathname = '/tasks'; state.isLoading = true
    const html = renderToStaticMarkup(<AppShell><p>current tasks</p></AppShell>)
    expect(html).toContain('<span>乡建</span><small>DAO</small>')
    expect(html).toContain('href="/tasks" class="bottom-link active"')
    expect(html).toContain('href="/events" class="bottom-link"')
    expect(html).toContain('正在加载页面…')
  })

  it('shows login and public navigation without publishing or notifications for a guest', () => {
    const html = renderToStaticMarkup(<AppShell><p>public content</p></AppShell>)
    expect(html).toContain('href="/login"')
    expect(html).toContain('public content')
    expect(html).toContain('href="/search"')
    expect(html).not.toContain('>发布</button>')
    expect(html).not.toContain('aria-label="通知"')
  })

  it('keeps the authenticated publish control on the personal page', () => {
    state.pathname = '/me'
    state.session = { user: { id: 'member' } } as RiceSession
    const html = renderToStaticMarkup(<AppShell>{null}</AppShell>)
    expect(html).toContain('href="/compose"')
    expect(html).toContain('aria-label="通知"')
    expect(html).not.toContain('href="/login"')
  })

  it('keeps the four main destinations available on a child page', () => {
    state.pathname = '/posts'
    const html = renderToStaticMarkup(<AppShell><p>post detail</p></AppShell>)
    expect(html).toContain('aria-label="返回上一页"')
    expect(html).toContain('aria-label="主要导航"')
    for (const path of ['/', '/tasks', '/events', '/me']) expect(html).toContain(`href="${path}"`)
  })
})
