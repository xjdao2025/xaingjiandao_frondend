import { createFileRoute } from '@tanstack/react-router'

import { UserProfilePage } from '~/features/social/UserProfilePage'

export const Route = createFileRoute('/profile/$actor/')({
  validateSearch: (search: Record<string, unknown>): { send?: '1' } => search.send === '1' || search.send === 1 ? { send: '1' } : {},
  component: ProfileRoute,
})

function ProfileRoute() {
  const { actor } = Route.useParams()
  return <UserProfilePage actor={actor} initialSend={Route.useSearch().send === '1'} />
}
