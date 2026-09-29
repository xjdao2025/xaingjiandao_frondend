import { createMemoryHistory, type AnyRoute } from '@tanstack/react-router'
import { expect, it, vi } from 'vitest'
import type { RiceSession } from '~/lib/models'

const state = vi.hoisted(() => ({ session: { token: 'token-a' } as RiceSession }))
const api = vi.hoisted(() => ({ task: vi.fn(), event: vi.fn() }))
vi.mock('~/features/session/session', () => ({ readStoredSession: () => state.session }))
vi.mock('~/features/tasks/api', () => ({ getTask: api.task }))
vi.mock('~/features/events/api', () => ({ getEvent: api.event }))
vi.mock('~/features/tasks/TaskDetailPage', () => ({ TaskDetailPage: () => null }))
vi.mock('~/features/events/EventDetail', () => ({ EventDetail: () => null }))
vi.mock('../routeTree.gen', async () => {
  const { createRootRoute, createRoute } = await import('@tanstack/react-router')
  const { Route: taskRoute } = await import('./tasks.$taskId')
  const { Route: eventRoute } = await import('./events_.$eventId')
  const task: AnyRoute['options'] = taskRoute.options
  const event: AnyRoute['options'] = eventRoute.options
  const root = createRootRoute()
  const home = createRoute({ getParentRoute: () => root, path: '/' })
  const taskDetail = createRoute({ getParentRoute: () => root, path: '/tasks/$taskId', loader: task.loader, loaderDeps: task.loaderDeps, ssr: task.ssr })
  const eventDetail = createRoute({ getParentRoute: () => root, path: '/events/$eventId', loader: event.loader, loaderDeps: event.loaderDeps, ssr: event.ssr })
  return { routeTree: root.addChildren([home, taskDetail, eventDetail]) }
})

import { getRouter } from '../router'

it('keeps the old page until each detail is ready and loads the current account', async () => {
  let finishTask!: (value: { id: string }) => void
  let finishEvent!: (value: { id: string }) => void
  api.task.mockImplementationOnce(() => new Promise(resolve => { finishTask = resolve }))
  api.event.mockImplementationOnce(() => new Promise(resolve => { finishEvent = resolve }))
  const router = getRouter()
  router.update({ history: createMemoryHistory({ initialEntries: ['/'] }), isServer: false, origin: 'http://localhost', scrollRestoration: false })
  await router.load()

  const taskNavigation = router.navigate({ to: '/tasks/$taskId', params: { taskId: 'task-1' } })
  await vi.waitFor(() => expect(api.task).toHaveBeenCalledOnce())
  expect(router.state.resolvedLocation?.pathname).toBe('/')
  finishTask({ id: 'task-1' })
  await taskNavigation
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ task: { id: 'task-1' }, viewerToken: 'token-a' })

  state.session = { token: 'token-b' } as RiceSession
  const eventNavigation = router.navigate({ to: '/events/$eventId', params: { eventId: 'event-1' } })
  await vi.waitFor(() => expect(api.event).toHaveBeenCalledOnce())
  expect(router.state.resolvedLocation?.pathname).toBe('/tasks/task-1')
  finishEvent({ id: 'event-1' })
  await eventNavigation
  expect(api.event).toHaveBeenCalledWith({ data: { id: 'event-1', token: 'token-b' } })
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ event: { id: 'event-1' }, viewerToken: 'token-b' })
})
