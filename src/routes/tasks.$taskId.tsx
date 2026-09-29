import { createFileRoute } from '@tanstack/react-router'

import { TaskDetailPage } from '~/features/tasks/TaskDetailPage'
import { getTask } from '~/features/tasks/api'
import { readStoredSession } from '~/features/session/session'

export const Route = createFileRoute('/tasks/$taskId')({
  ssr: false,
  loaderDeps: () => ({ token: readStoredSession()?.token ?? null }),
  loader: async ({ params, deps }) => {
    try {
      return { task: await getTask({ data: { id: params.taskId, token: deps.token ?? undefined } }), error: '', viewerToken: deps.token }
    } catch (reason) {
      return { task: null, error: reason instanceof Error ? reason.message : '任务暂时无法加载', viewerToken: deps.token }
    }
  },
  component: () => <TaskDetailPage taskId={Route.useParams().taskId} initial={Route.useLoaderData()} />,
})
