import { createFileRoute } from '@tanstack/react-router'
import { GovernanceDetail } from '~/features/alliance/AlliancePanel'

export const Route = createFileRoute('/alliance/announcements/$id')({
  component: () => <GovernanceDetail kind="announcement" id={Route.useParams().id} />,
})
