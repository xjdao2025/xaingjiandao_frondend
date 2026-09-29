import { createMemoryHistory } from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loaders = vi.hoisted(() => ({
  tasks: () => Promise.resolve('tasks'),
  events: () => Promise.resolve('events'),
  search: () => Promise.resolve('search'),
}))

// Keep the real application's router options, replacing only network-backed routes.
vi.mock('../routeTree.gen', async () => {
  const { createRootRoute, createRoute } = await import('@tanstack/react-router')
  const root = createRootRoute()
  const home = createRoute({ getParentRoute: () => root, path: '/', loader: () => 'home' })
  const children = (['tasks', 'events', 'search'] as const).map((path) => createRoute({
    getParentRoute: () => root,
    path,
    loader: () => loaders[path](),
    pendingComponent: () => null,
  }))
  return { routeTree: root.addChildren([home, ...children]) }
})

import { getRouter } from '../router'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

async function readyRouter() {
  const router = getRouter()
  // Node exercises client navigation; DOM scroll restoration remains browser QA.
  router.update({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    isServer: false,
    origin: 'http://localhost',
    scrollRestoration: false,
  })
  await router.load()
  return router
}

beforeEach(() => {
  vi.useFakeTimers()
  loaders.tasks = () => Promise.resolve('tasks')
  loaders.events = () => Promise.resolve('events')
  loaders.search = () => Promise.resolve('search')
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('ready-before-navigation', () => {
  it('keeps the visible route past the ordinary pending delay until its next loader resolves', async () => {
    const started = deferred<void>()
    const data = deferred<string>()
    loaders.tasks = () => { started.resolve(); return data.promise }
    const router = await readyRouter()
    const previousMatches = router.state.matches

    const navigation = router.navigate({ to: '/tasks' })
    await started.promise
    await vi.advanceTimersByTimeAsync(2_000)

    expect(router.history.location.pathname).toBe('/tasks')
    expect(router.state.matches).toBe(previousMatches)
    expect(router.state.isLoading).toBe(true)
    expect(router.state.location.pathname).toBe('/tasks')
    expect(router.state.resolvedLocation?.pathname).toBe('/')

    data.resolve('loaded tasks')
    await navigation
    expect(router.state.resolvedLocation?.pathname).toBe('/tasks')
    expect(router.state.matches.at(-1)).toMatchObject({ status: 'success', loaderData: 'loaded tasks' })
  })

  it('does not let a superseded slow navigation replace the newer destination', async () => {
    const taskStarted = deferred<void>()
    const oldData = deferred<string>()
    loaders.tasks = () => { taskStarted.resolve(); return oldData.promise }
    const eventStarted = deferred<void>()
    const nextData = deferred<string>()
    loaders.events = () => { eventStarted.resolve(); return nextData.promise }
    const router = await readyRouter()

    const oldNavigation = router.navigate({ to: '/tasks' })
    await taskStarted.promise
    const nextNavigation = router.navigate({ to: '/events' })
    await eventStarted.promise
    expect(router.state.resolvedLocation?.pathname).toBe('/')

    nextData.resolve('new destination')
    await nextNavigation
    const visibleMatches = router.state.matches
    oldData.resolve('stale tasks')
    await oldNavigation
    await vi.advanceTimersByTimeAsync(2_000)

    expect(router.state.matches).toBe(visibleMatches)
    expect(router.state.resolvedLocation?.pathname).toBe('/events')
    expect(router.state.matches.at(-1)).toMatchObject({ status: 'success', loaderData: 'new destination' })
  })

  it('commits a failed loader as an error instead of leaving navigation pending forever', async () => {
    const started = deferred<void>()
    const data = deferred<string>()
    const failure = new Error('服务暂时不可用')
    loaders.search = () => { started.resolve(); return data.promise }
    const router = await readyRouter()

    const navigation = router.navigate({ to: '/search', search: { q: '' } })
    await started.promise
    expect(router.state.resolvedLocation?.pathname).toBe('/')
    data.reject(failure)
    await navigation

    expect(router.state.resolvedLocation?.pathname).toBe('/search')
    expect(router.state.matches.at(-1)).toMatchObject({ status: 'error', error: failure })
  })
})
