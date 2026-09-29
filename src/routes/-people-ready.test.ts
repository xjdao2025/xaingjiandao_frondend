import { createMemoryHistory, type AnyRoute } from '@tanstack/react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { RiceSession, SocialConnectionPage } from '~/lib/models'

const state = vi.hoisted(() => ({ session: null as RiceSession | null }))
const api = vi.hoisted(() => ({ connections: vi.fn() }))
vi.mock('~/features/session/session', () => ({ readStoredSession: () => state.session }))
vi.mock('~/features/social/api', () => ({ getSocialConnections: api.connections }))
vi.mock('~/features/social/PeopleListPage', () => ({ PeopleListPage: () => null }))

vi.mock('../routeTree.gen', async () => {
  const { createRootRoute, createRoute } = await import('@tanstack/react-router')
  const { Route: followersRoute } = await import('./profile.$actor.followers')
  const { Route: followingRoute } = await import('./profile.$actor.following')
  const followersOptions: AnyRoute['options'] = followersRoute.options
  const followingOptions: AnyRoute['options'] = followingRoute.options
  const root = createRootRoute()
  const home = createRoute({ getParentRoute: () => root, path: '/' })
  const profile = createRoute({ getParentRoute: () => root, path: '/profile' })
  const actor = createRoute({ getParentRoute: () => profile, path: '/$actor' })
  const followers = createRoute({ getParentRoute: () => actor, path: '/followers', loader: followersOptions.loader, loaderDeps: followersOptions.loaderDeps, ssr: followersOptions.ssr })
  const following = createRoute({ getParentRoute: () => actor, path: '/following', loader: followingOptions.loader, loaderDeps: followingOptions.loaderDeps, ssr: followingOptions.ssr })
  return { routeTree: root.addChildren([home, profile.addChildren([actor.addChildren([followers, following])])]) }
})

import { getRouter } from '../router'

function page(actor: string): SocialConnectionPage {
  const profile = { did: actor, handle: actor, followersCount: 0, followsCount: 0, postsCount: 0 }
  return { subject: profile, profiles: [profile] }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.useFakeTimers()
  state.session = { pds: { access_jwt: 'jwt-a' } } as RiceSession
  api.connections.mockReset().mockImplementation(({ data }) => Promise.resolve(page(data.actor)))
})
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers() })

it('waits for the selected actor’s first page and loads the other relationship with the current session', async () => {
  const first = deferred<SocialConnectionPage>()
  api.connections.mockReturnValueOnce(first.promise)
  const router = getRouter()
  router.update({ history: createMemoryHistory({ initialEntries: ['/'] }), isServer: false, origin: 'http://localhost', scrollRestoration: false })
  await router.load()

  const navigation = router.navigate({ to: '/profile/$actor/followers', params: { actor: 'alice' } })
  await vi.advanceTimersByTimeAsync(2_000)
  expect(router.state.resolvedLocation?.pathname).toBe('/')
  first.resolve(page('alice'))
  await navigation
  expect(router.state.matches.at(-1)?.loaderData).toEqual(page('alice'))
  expect(api.connections).toHaveBeenCalledWith({ data: { actor: 'alice', kind: 'followers', accessJwt: 'jwt-a' } })

  state.session = { pds: { access_jwt: 'jwt-b' } } as RiceSession
  await router.navigate({ to: '/profile/$actor/following', params: { actor: 'bob' } })
  expect(router.state.matches.at(-1)?.loaderData).toEqual(page('bob'))
  expect(api.connections).toHaveBeenLastCalledWith({ data: { actor: 'bob', kind: 'following', accessJwt: 'jwt-b' } })
})
