import { createMemoryHistory, type AnyRoute } from '@tanstack/react-router'
import { expect, it, vi } from 'vitest'
import type { RiceSession } from '~/lib/models'

const state = vi.hoisted(() => ({ session: { token: 'rice-token', user: { id: 'account' }, pds: { did: 'did:plc:account' } } as RiceSession }))
const api = vi.hoisted(() => ({ nodes: vi.fn(), postDraft: vi.fn(), tasks: vi.fn(), task: vi.fn(), events: vi.fn(), event: vi.fn() }))
vi.mock('~/features/session/session', () => ({ readStoredSession: () => state.session }))
vi.mock('~/features/feed/ComposePanel', () => ({ ComposePanel: () => null }))
vi.mock('~/features/feed/post-draft', () => ({ readPostDraft: api.postDraft }))
vi.mock('~/features/nodes/api', () => ({ getNodes: api.nodes }))
vi.mock('~/features/tasks/api', () => ({ getTasks: api.tasks, getTask: api.task }))
vi.mock('~/features/events/api', () => ({ getEvents: api.events, getEvent: api.event }))
vi.mock('../routeTree.gen', async () => {
  const { createRootRoute, createRoute } = await import('@tanstack/react-router')
  const { Route } = await import('./compose')
  const options: AnyRoute['options'] = Route.options
  const root = createRootRoute()
  const home = createRoute({ getParentRoute: () => root, path: '/' })
  const compose = createRoute({ getParentRoute: () => root, path: '/compose', loader: options.loader, loaderDeps: options.loaderDeps, validateSearch: options.validateSearch, ssr: options.ssr, staleTime: options.staleTime, preloadStaleTime: options.preloadStaleTime })
  return { routeTree: root.addChildren([home, compose]) }
})

it('loads the explicitly selected published task without opening another draft', async () => {
  api.tasks.mockReset()
  api.nodes.mockResolvedValue([{ id: 'community', name: '社区' }])
  const task = { id: 'published-task', status: 'open', allowed_actions: ['edit'] }
  api.task.mockResolvedValue(task)
  const router = getRouter()
  router.update({ history: createMemoryHistory({ initialEntries: ['/compose?kind=task&editId=published-task'] }), isServer: false, origin: 'http://localhost', scrollRestoration: false })
  await router.load()
  expect(api.task).toHaveBeenCalledWith({ data: { token: 'rice-token', id: task.id } })
  expect(api.tasks).not.toHaveBeenCalled()
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ editId: task.id, taskDraft: task })
})

import { getRouter } from '../router'

it('keeps the previous page until the selected publish form and its draft are ready', async () => {
  let finishDraft!: (value: unknown[]) => void
  api.nodes.mockResolvedValue([{ id: 'community', name: '社区' }])
  api.postDraft.mockResolvedValue(null)
  api.tasks.mockImplementation(() => new Promise(resolve => { finishDraft = resolve }))
  const router = getRouter()
  router.update({ history: createMemoryHistory({ initialEntries: ['/'] }), isServer: false, origin: 'http://localhost', scrollRestoration: false })
  await router.load()

  const navigation = router.navigate({ to: '/compose', search: { kind: 'task' } })
  await vi.waitFor(() => expect(api.tasks).toHaveBeenCalledOnce())
  expect(router.state.resolvedLocation?.pathname).toBe('/')
  expect(api.events).not.toHaveBeenCalled()

  const draft = { id: 'task-draft', title: '待续任务' }
  finishDraft([draft])
  await navigation
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ kind: 'task', managedNodes: [{ id: 'community' }], taskDraft: draft })
  expect(router.state.resolvedLocation?.pathname).toBe('/compose')
})
