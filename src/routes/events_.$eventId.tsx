import { createFileRoute } from '@tanstack/react-router'
import { EventDetail } from '~/features/events/EventDetail'
import { getEvent } from '~/features/events/api'
import { viewerDeps, viewerLoader } from './-loaders'

export const Route = createFileRoute('/events_/$eventId')({
  ssr: false,
  loaderDeps: viewerDeps,
  loader: ({ params, deps }) =>
    viewerLoader('event', deps.token, () => getEvent({ data: { id: params.eventId, token: deps.token ?? undefined } }), '活动暂时无法加载'),
  component: EventRoute,
})

function EventRoute() {
  const { eventId } = Route.useParams()
  return <EventDetail eventId={eventId} initial={Route.useLoaderData()} />
}
