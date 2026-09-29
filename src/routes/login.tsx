import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '~/features/session/LoginPage'
import { loginReturnTo } from '~/features/session/login-redirect'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } => ({ returnTo: loginReturnTo(search.returnTo) }),
  component: () => <LoginPage returnTo={Route.useSearch().returnTo} />,
})
