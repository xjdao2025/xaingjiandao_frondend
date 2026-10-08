import { createFileRoute } from '@tanstack/react-router'

import { TaskDetailPage } from '~/features/tasks/TaskDetailPage'
import { getTask } from '~/features/tasks/api'
import { viewerDeps, viewerLoader } from './-loaders'

export const Route = createFileRoute('/tasks/$taskId')({
  ssr: false,
  loaderDeps: viewerDeps,
  loader: ({ params, deps }) =>
    viewerLoader('task', deps.token, () => getTask({ data: { id: params.taskId, token: deps.token ?? undefined } }), '任务暂时无法加载'),
  component: () => <TaskDetailPage taskId={Route.useParams().taskId} initial={Route.useLoaderData()} />,
})
