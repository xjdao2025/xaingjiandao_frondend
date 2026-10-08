import { createFileRoute } from '@tanstack/react-router'

import { TasksPage } from '~/features/tasks/TasksPage'
import { getTaskPage, type TaskPage } from '~/features/tasks/api'
import { keepPreviousOnError, type RefreshedPage } from './-loaders'

type TaskRouteData = RefreshedPage<TaskPage>

export const Route = createFileRoute('/tasks/')({
  staleTime: 30_000,
  preloadStaleTime: 30_000,
  beforeLoad: ({ matches }): { previousData: TaskRouteData | undefined } => ({
    previousData: matches.find((match) => match.routeId === '/tasks/')?.loaderData as TaskRouteData | undefined,
  }),
  loader: { staleReloadMode: 'background', handler: ({ context }) =>
    keepPreviousOnError(context.previousData, () => getTaskPage({ data: { limit: 12, sort: 'published' } })) },
  component: TasksRoute,
})

function TasksRoute() {
  const { page, refreshError } = Route.useLoaderData()
  return <TasksPage initialPage={page} refreshError={refreshError} />
}
