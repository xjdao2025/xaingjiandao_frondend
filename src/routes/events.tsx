import { createFileRoute } from '@tanstack/react-router'
import { EventsPage } from '~/features/events/EventsPage'
import { getEvents, type EventPage } from '~/features/events/api'

type EventRouteData = { page: EventPage; refreshError: string }

export const Route = createFileRoute('/events')({
  staleTime: 30_000,
  preloadStaleTime: 30_000,
  beforeLoad: ({ matches }): { previousData: EventRouteData | undefined } => ({
    previousData: matches.find((match) => match.routeId === '/events')?.loaderData as EventRouteData | undefined,
  }),
  loader: { staleReloadMode: 'background', handler: async ({ context }): Promise<EventRouteData> => {
    try {
      return { page: await getEvents({ data: {} }), refreshError: '' }
    } catch (error) {
      if (!context.previousData) throw error
      return { ...context.previousData, refreshError: '暂时无法更新，已保留上次显示的内容。' }
    }
  } },
  component: () => { const { page, refreshError } = Route.useLoaderData(); return <EventsPage initialPage={page} refreshError={refreshError} /> },
})
