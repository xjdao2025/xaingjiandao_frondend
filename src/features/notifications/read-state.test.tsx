import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import type { NotificationView } from '~/lib/models'
import { applyNotificationState } from './local-state'

const mock = vi.hoisted(() => ({
  social: vi.fn(), business: vi.fn(), readSocial: vi.fn(), readBusiness: vi.fn(),
  values: [] as unknown[], index: 0,
  effects: [] as Array<{ deps: unknown[]; cleanup?: () => void }>,
  pending: [] as Array<() => void>,
}))
vi.mock('./api', async (original) => ({
  ...await original<typeof import('./api')>(),
  getNotifications: mock.social, getTaskNotifications: mock.business,
  markNotificationsRead: mock.readSocial, markTaskNotificationsRead: mock.readBusiness,
}))
vi.mock('../session/session', () => ({ useStoredSession: () => ({
  isReady: true, session: { token: 'rice-token', pds: { access_jwt: 'pds-token', did: 'did:plc:reader' } },
}) }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const i = mock.index++
    if (!(i in mock.values)) mock.values[i] = initial
    return [mock.values[i], (value: unknown) => {
      mock.values[i] = typeof value === 'function' ? value(mock.values[i]) : value
    }]
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

import { NotificationsPage } from './NotificationsPage'

function elements(node: ReactNode): Array<ReactElement<Record<string, unknown>>> {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!isValidElement<Record<string, unknown>>(node)) return []
  return [node, ...elements(node.props.children as ReactNode)]
}

function render() {
  mock.index = 0
  const inbox = NotificationsPage()
  const view = (inbox.type as (props: typeof inbox.props) => ReactNode)(inbox.props)
  mock.pending.splice(0).forEach((effect) => effect())
  return elements(view)
}

afterEach(() => {
  mock.effects.forEach((effect) => effect?.cleanup?.())
  mock.effects = []; mock.values = []; mock.pending = []
  vi.unstubAllGlobals(); vi.clearAllMocks()
})

it('keeps failed post reads unread while Rice succeeds, then retries the write and clears its error', async () => {
  vi.stubGlobal('window', new EventTarget())
  const notification = { author: { handle: 'actor.test' }, indexedAt: '2026-09-22T00:00:00Z', text: '', isRead: false }
  const social: NotificationView = { ...notification, uri: 'at://did:plc:actor/app.bsky.feed.post/reply', reason: 'reply' }
  const business: NotificationView[] = ['task', 'event'].map((subjectType) => ({
    ...notification, uri: `business:${subjectType}`, reason: `${subjectType}-application_created`, subjectType, subjectId: subjectType,
  }))
  mock.social.mockResolvedValue({ notifications: [social], cursor: null }); mock.business.mockResolvedValue({ notifications: business, cursor: null })
  mock.readBusiness.mockResolvedValue(undefined)
  let fail!: (error: Error) => void
  mock.readSocial.mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject }))
  const unread = () => render().filter((element) => element.props.className === 'notification-row unread')
  const action = (label: string, prop: 'clickAction' | 'onClick') =>
    render().find((element) => element.props.label === label)!.props[prop] as () => Promise<void>

  await vi.waitFor(() => expect(unread()).toHaveLength(3))
  const marking = action('全部已读', 'clickAction')()
  expect(unread()).toHaveLength(3)
  fail(new Error('写入失败')); await marking
  expect(unread()).toHaveLength(1)
  expect(render().find((element) => element.props.role === 'alert')).toBeDefined()
  expect(mock.readSocial).toHaveBeenCalledWith({ data: 'pds-token' })
  expect(mock.readBusiness).toHaveBeenCalledWith({ data: 'rice-token' })

  mock.readSocial.mockResolvedValueOnce(undefined)
  await action('重试', 'onClick')()
  expect(mock.readSocial).toHaveBeenCalledTimes(2)
  expect(unread()).toHaveLength(0)
  expect(render().find((element) => element.props.role === 'alert')).toBeUndefined()
  expect(mock.social).toHaveBeenCalledTimes(1)
})

it('loads later pages from each source without duplicating the first page', async () => {
  vi.stubGlobal('window', new EventTarget())
  const row = (uri: string, subjectType?: string): NotificationView => ({
    uri, reason: 'reply', author: { handle: 'actor.test' }, text: '', isRead: false,
    indexedAt: '2026-09-22T00:00:00Z', ...(subjectType ? { subjectType, subjectId: uri } : {}),
  })
  mock.social.mockImplementation(async ({ data }: { data: { cursor?: string } }) => data.cursor
    ? { notifications: [row('social-old'), row('social-first')], cursor: null }
    : { notifications: [row('social-first')], cursor: 'social-next' })
  mock.business.mockImplementation(async ({ data }: { data: { cursor?: string } }) => data.cursor
    ? { notifications: [row('business-old', 'task')], cursor: null }
    : { notifications: [row('business-first', 'task')], cursor: 'business-next' })
  const listed = () => render().filter((element) => String(element.props.className).includes('notification-row'))
  await vi.waitFor(() => expect(listed()).toHaveLength(2))
  const load = render().find((element) => element.props.onLoadMore)!.props.onLoadMore as () => Promise<void>
  await load()
  expect(listed()).toHaveLength(4)
  expect(mock.social).toHaveBeenCalledWith({ data: { token: 'pds-token', cursor: 'social-next' } })
  expect(mock.business).toHaveBeenCalledWith({ data: { token: 'rice-token', cursor: 'business-next' } })
})

it('does not mark all as read while an older page is still loading', async () => {
  vi.stubGlobal('window', new EventTarget())
  const row: NotificationView = {
    uri: 'social-first', reason: 'reply', author: { handle: 'actor.test' }, text: '',
    indexedAt: '2026-09-22T00:00:00Z', isRead: false,
  }
  let finishPage!: (page: { notifications: NotificationView[]; cursor: null }) => void
  mock.social.mockImplementation(({ data }: { data: { cursor?: string } }) => data.cursor
    ? new Promise((resolve) => { finishPage = resolve })
    : Promise.resolve({ notifications: [row], cursor: 'social-next' }))
  mock.business.mockResolvedValue({ notifications: [], cursor: null })
  await vi.waitFor(() => expect(render().filter((element) => element.props.className === 'notification-row unread')).toHaveLength(1))

  const load = render().find((element) => element.props.onLoadMore)!.props.onLoadMore as () => Promise<void>
  const pending = load()
  const mark = render().find((element) => element.props.label === '全部已读')!
  expect(mark.props.isDisabled).toBe(true)
  await (mark.props.clickAction as () => Promise<void>)()
  expect(mock.readSocial).not.toHaveBeenCalled()
  finishPage({ notifications: [{ ...row, uri: 'social-old' }], cursor: null })
  await pending
  expect(render().filter((element) => element.props.className === 'notification-row unread')).toHaveLength(2)
})

it('allows marking all when older pages may contain unread notifications', async () => {
  vi.stubGlobal('window', new EventTarget())
  mock.social.mockResolvedValue({ notifications: [{
    uri: 'social-first', reason: 'reply', author: { handle: 'actor.test' }, text: '',
    indexedAt: '2026-09-22T00:00:00Z', isRead: true,
  }], cursor: 'social-next' })
  mock.business.mockResolvedValue({ notifications: [], cursor: null })
  mock.readSocial.mockResolvedValue(undefined)
  mock.readBusiness.mockResolvedValue(undefined)
  await vi.waitFor(() => expect(render().find((element) => element.props.onLoadMore)).toBeDefined())
  const mark = render().find((element) => element.props.label === '全部已读')!
  expect(mark.props.isDisabled).toBe(false)
  await (mark.props.clickAction as () => Promise<void>)()
  expect(mock.readSocial).toHaveBeenCalledTimes(1)
  expect(mock.readBusiness).toHaveBeenCalledTimes(1)
})

it('clears read notifications across unloaded pages while retaining unread ones', async () => {
  const storage = new Map<string, string>()
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
  }))
  const read = (uri: string): NotificationView => ({ uri, reason: 'reply', author: { handle: 'actor.test' }, text: '', indexedAt: '2026-09-22T00:00:00Z', isRead: true })
  const unread: NotificationView = { ...read('business-unread'), subjectType: 'task', subjectId: 'task-id', isRead: false }
  mock.social.mockImplementation(async ({ data }: { data: { cursor?: string } }) => data.cursor
    ? { notifications: [read('social-old')], cursor: null }
    : { notifications: [read('social-first')], cursor: 'social-next' })
  mock.business.mockResolvedValue({ notifications: [unread], cursor: null })
  await vi.waitFor(() => expect(render().filter((element) => String(element.props.className).includes('notification-row'))).toHaveLength(2))
  const clear = render().find((element) => element.props.label === '清除已读')!.props.clickAction as () => Promise<void>
  await clear()
  expect(applyNotificationState('did:plc:reader', [read('social-first'), read('social-old')])).toEqual([])
  expect(applyNotificationState('did:plc:reader', [unread])).toEqual([unread])
  expect(mock.social).toHaveBeenCalledWith({ data: { token: 'pds-token', cursor: 'social-next' } })
})
