import { createMemoryHistory, type AnyRoute } from '@tanstack/react-router'
import { expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ loadThread: vi.fn() }))
vi.mock('~/features/session/session', () => ({ readStoredSession: () => null }))
vi.mock('~/features/feed/api', () => ({ loadCachedThread: api.loadThread }))
vi.mock('~/features/feed/PostThreadPanel', () => ({ PostThreadPanel: () => null }))
vi.mock('../routeTree.gen', async () => {
  const { createRootRoute, createRoute } = await import('@tanstack/react-router')
  const { Route } = await import('./posts')
  const options: AnyRoute['options'] = Route.options
  const root = createRootRoute()
  const home = createRoute({ getParentRoute: () => root, path: '/' })
  const posts = createRoute({ getParentRoute: () => root, path: '/posts', loader: options.loader, loaderDeps: options.loaderDeps, validateSearch: options.validateSearch, ssr: options.ssr })
  return { routeTree: root.addChildren([home, posts]) }
})

import { getRouter } from '../router'

it('opens the post child page after its thread is ready', async () => {
  let finish!: (value: unknown) => void
  api.loadThread.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const router = getRouter()
  router.update({ history: createMemoryHistory({ initialEntries: ['/'] }), isServer: false, origin: 'http://localhost', scrollRestoration: false })
  await router.load()

  const navigation = router.navigate({ to: '/posts', search: { uri: 'at://post' } })
  await vi.waitFor(() => expect(api.loadThread).toHaveBeenCalledOnce())
  expect(router.state.resolvedLocation?.pathname).toBe('/')

  finish({ post: { uri: 'at://post' }, replies: [] })
  await navigation
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ thread: { post: { uri: 'at://post' } }, error: '' })
  expect(router.state.resolvedLocation?.pathname).toBe('/posts')
})
