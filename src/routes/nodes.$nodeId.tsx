import { createFileRoute } from '@tanstack/react-router'
import { NodeDetail } from '~/features/nodes/NodesPanel'

export const Route = createFileRoute('/nodes/$nodeId')({
  component: () => <NodeDetail nodeId={Route.useParams().nodeId} />,
})
