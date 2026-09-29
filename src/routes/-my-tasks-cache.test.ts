import { createMemoryHistory, type AnyRoute } from '@tanstack/react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { RiceSession } from '~/lib/models'

const state = vi.hoisted(() => ({ session: null as RiceSession | null }))
const api = vi.hoisted(() => ({ tasks: vi.fn() }))
vi.mock('~/features/session/session', () => ({ readStoredSession: () => state.session }))
vi.mock('~/features/tasks/api', () => ({ getTaskPage: api.tasks }))
vi.mock('~/features/tasks/MyTasksPage', () => ({ MyTasksPage: () => null }))

vi.mock('../routeTree.gen', async () => {
  const { createRootRoute, createRoute } = await import('@tanstack/react-router')
  const { Route } = await import('./me.tasks')
  const options: AnyRoute['options'] = Route.options
  const root = createRootRoute()
  const home = createRoute({ getParentRoute: () => root, path: '/' })
  const parent = createRoute({ getParentRoute: () => root, path: '/me' })
  const tasks = createRoute({
    getParentRoute: () => parent, path: '/tasks',
    loader: options.loader, loaderDeps: options.loaderDeps, beforeLoad: options.beforeLoad,
    staleTime: options.staleTime, preloadStaleTime: options.preloadStaleTime, ssr: options.ssr,
  })
  return { routeTree: root.addChildren([home, parent.addChildren([tasks])]) }
})

import { getRouter } from '../router'

function session(id: string) { return { token: `token-${id}`, user: { id } } as RiceSession }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
async function readyRouter() {
  const router = getRouter()
  router.update({ history: createMemoryHistory({ initialEntries: ['/'] }), isServer: false, origin: 'http://localhost', scrollRestoration: false })
  await router.load()
  return router
}

beforeEach(() => {
  vi.useFakeTimers()
  state.session = session('a')
  api.tasks.mockReset().mockResolvedValue({ data: [], meta: { next_cursor: null } })
})
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers() })

it('waits for personal tabs and tasks before navigation, then reuses the current account cache', async () => {
  const managed = deferred<{ data: { id: string }[]; meta: { next_cursor: null } }>()
  api.tasks.mockImplementation(({ data }) => data.mine === 'managed' ? managed.promise : Promise.resolve({ data: [], meta: { next_cursor: null } }))
  const router = await readyRouter()
  const navigation = router.navigate({ to: '/me/tasks' })
  await vi.advanceTimersByTimeAsync(2_000)
  expect(router.state.resolvedLocation?.pathname).toBe('/')

  managed.resolve({ data: [{ id: 'task-a' }], meta: { next_cursor: null } })
  await navigation
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ initialData: { accountId: 'a', sessionToken: 'token-a', tasks: [{ id: 'task-a' }] } })
  await router.navigate({ to: '/' })
  await router.navigate({ to: '/me/tasks' })
  expect(api.tasks).toHaveBeenCalledTimes(3)
})

it('loads a different account instead of showing the previous account’s tasks', async () => {
  api.tasks.mockImplementation(({ data }) => Promise.resolve({ data: data.mine === 'managed' ? [{ id: `task-${data.token}` }] : [], meta: { next_cursor: null } }))
  const router = await readyRouter()
  await router.navigate({ to: '/me/tasks' })
  await router.navigate({ to: '/' })
  state.session = session('b')
  await router.navigate({ to: '/me/tasks' })
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ initialData: { accountId: 'b', sessionToken: 'token-b', tasks: [{ id: 'task-token-b' }] } })
  expect(api.tasks).toHaveBeenCalledTimes(6)
})

it('can fill an initially guest route after the stored session is repaired', async () => {
  state.session = null
  const router = await readyRouter()
  await router.navigate({ to: '/me/tasks' })
  expect(router.state.matches.at(-1)?.loaderData).toEqual({ initialData: null, error: '' })
  expect(api.tasks).not.toHaveBeenCalled()

  state.session = session('a')
  await router.invalidate({ filter: (match) => match.routeId === '/me/tasks' })
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ initialData: { accountId: 'a', sessionToken: 'token-a', tasks: [] } })
  expect(api.tasks).toHaveBeenCalledTimes(3)
})
