import { createFileRoute } from '@tanstack/react-router'
import { SendGrainPage } from '~/features/grains/PersonalGrainActions'

export const Route = createFileRoute('/me/grains_/send')({
  validateSearch: (search: Record<string, unknown>): { to?: string } => typeof search.to === 'string' && search.to.trim() ? { to: search.to.trim() } : {},
  component: () => <SendGrainPage to={Route.useSearch().to} />,
})
