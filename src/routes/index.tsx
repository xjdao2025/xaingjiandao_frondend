import { createFileRoute } from '@tanstack/react-router'

import {
  getPosts,
  readCachedFeed,
  writeCachedFeed,
} from '~/features/feed/api'
import { PlazaPage } from '~/features/feed/PlazaPage'
import { readStoredSession, refreshStoredSession, tokenExpiresSoon } from '~/features/session/session'

export const Route = createFileRoute('/')({
  loader: {
    handler: async () => {
      let session = readStoredSession()
      if (session && tokenExpiresSoon(session.pds.access_jwt)) {
        await refreshStoredSession(session).catch(() => undefined)
        session = readStoredSession()
      }
      const cachedFeed = readCachedFeed(session?.pds.did)
      if (cachedFeed) return cachedFeed

      const feed = await getPosts({
        data: {
          accessJwt: session?.pds.access_jwt,
          did: session?.pds.did,
        },
      })
      writeCachedFeed(feed, session?.pds.did)
      return feed
    },
    staleReloadMode: 'blocking',
  },
  component: PlazaRoute,
})

function PlazaRoute() {
  const initialFeed = Route.useLoaderData()
  return <PlazaPage initialFeed={initialFeed} />
}
