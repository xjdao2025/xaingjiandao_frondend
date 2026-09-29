import { createFileRoute } from '@tanstack/react-router'

import { PeopleListPage } from '~/features/social/PeopleListPage'
import { getSocialConnections } from '~/features/social/api'
import { readStoredSession } from '~/features/session/session'

export const Route = createFileRoute('/profile/$actor/following')({
  ssr: false,
  loaderDeps: () => ({ accessJwt: readStoredSession()?.pds.access_jwt ?? null }),
  loader: ({ params, deps }) => getSocialConnections({ data: { actor: params.actor, kind: 'following', accessJwt: deps.accessJwt ?? undefined } }),
  component: FollowingRoute,
})

function FollowingRoute() {
  const { actor } = Route.useParams()
  return <PeopleListPage actor={actor} kind="following" initialPage={Route.useLoaderData()} loaderAccessJwt={Route.useLoaderDeps().accessJwt} />
}
