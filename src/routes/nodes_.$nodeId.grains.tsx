import { createFileRoute } from '@tanstack/react-router'

import { GrainHistoryPage } from '~/features/grains/GrainHistoryPage'

export const Route = createFileRoute('/nodes_/$nodeId/grains')({
  component: () => <GrainHistoryPage nodeId={Route.useParams().nodeId} />,
})
