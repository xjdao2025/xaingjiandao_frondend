import { createFileRoute } from '@tanstack/react-router'

import { TasksPage } from '~/features/tasks/TasksPage'
import { getTaskPage, type TaskPage } from '~/features/tasks/api'
import { getNodes, type CommunityNode } from '~/features/nodes/api'

type TaskRouteData = { page: TaskPage; nodes: CommunityNode[]; refreshError: string }

export const Route = createFileRoute('/tasks/')({
  staleTime: 30_000,
  preloadStaleTime: 30_000,
  beforeLoad: ({ matches }): { previousData: TaskRouteData | undefined } => ({
    previousData: matches.find((match) => match.routeId === '/tasks/')?.loaderData as TaskRouteData | undefined,
  }),
  loader: { staleReloadMode: 'background', handler: async ({ context }): Promise<TaskRouteData> => {
    try {
      const [page, nodes] = await Promise.all([getTaskPage({ data: { limit: 12, sort: 'published' } }), getNodes({ data: {} })])
      return { page, nodes, refreshError: '' }
    } catch (error) {
      if (!context.previousData) throw error
      return { ...context.previousData, refreshError: '暂时无法更新，已保留上次显示的内容。' }
    }
  } },
  component: TasksRoute,
})

function TasksRoute() {
  const { page, nodes, refreshError } = Route.useLoaderData()
  return <TasksPage initialPage={page} initialNodes={nodes} refreshError={refreshError} />
}
