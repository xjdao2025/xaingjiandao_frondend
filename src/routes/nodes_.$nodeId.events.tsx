import { createFileRoute } from '@tanstack/react-router'

import { EventsPage } from '~/features/events/EventsPage'

export const Route = createFileRoute('/nodes_/$nodeId/events')({
  component: () => <EventsPage nodeId={Route.useParams().nodeId} />,
})
