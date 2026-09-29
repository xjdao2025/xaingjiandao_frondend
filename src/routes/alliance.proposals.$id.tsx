import { createFileRoute } from '@tanstack/react-router'
import { GovernanceDetail } from '~/features/alliance/AlliancePanel'

export const Route = createFileRoute('/alliance/proposals/$id')({
  component: () => <GovernanceDetail kind="proposal" id={Route.useParams().id} />,
})
