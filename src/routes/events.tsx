import { createFileRoute } from '@tanstack/react-router'
import { EventsPage } from '~/features/events/EventsPage'
import { getEvents, type EventPage } from '~/features/events/api'
import { keepPreviousOnError, type RefreshedPage } from './-loaders'

type EventRouteData = RefreshedPage<EventPage>

export const Route = createFileRoute('/events')({
  staleTime: 30_000,
  preloadStaleTime: 30_000,
  beforeLoad: ({ matches }): { previousData: EventRouteData | undefined } => ({
    previousData: matches.find((match) => match.routeId === '/events')?.loaderData as EventRouteData | undefined,
  }),
  loader: { staleReloadMode: 'background', handler: ({ context }) => keepPreviousOnError(context.previousData, () => getEvents({ data: {} })) },
  component: () => { const { page, refreshError } = Route.useLoaderData(); return <EventsPage initialPage={page} refreshError={refreshError} /> },
})
