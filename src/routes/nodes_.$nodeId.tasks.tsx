import { createFileRoute } from '@tanstack/react-router'

import { TasksPage } from '~/features/tasks/TasksPage'

export const Route = createFileRoute('/nodes_/$nodeId/tasks')({
  component: () => <TasksPage nodeId={Route.useParams().nodeId} />,
})
