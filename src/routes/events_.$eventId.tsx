import { createFileRoute } from '@tanstack/react-router'
import { EventDetail } from '~/features/events/EventDetail'
import { getEvent } from '~/features/events/api'
import { readStoredSession } from '~/features/session/session'

export const Route = createFileRoute('/events_/$eventId')({
  ssr: false,
  loaderDeps: () => ({ token: readStoredSession()?.token ?? null }),
  loader: async ({ params, deps }) => {
    try {
      return { event: await getEvent({ data: { id: params.eventId, token: deps.token ?? undefined } }), error: '', viewerToken: deps.token }
    } catch (reason) {
      return { event: null, error: reason instanceof Error ? reason.message : '活动暂时无法加载', viewerToken: deps.token }
    }
  },
  component: EventRoute,
})

function EventRoute() {
  const { eventId } = Route.useParams()
  return <EventDetail eventId={eventId} initial={Route.useLoaderData()} />
}
