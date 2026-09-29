import { createFileRoute } from '@tanstack/react-router'

import { RegisterPage } from '~/features/account/RegisterPage'
import { loginReturnTo } from '~/features/session/login-redirect'

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } => ({ returnTo: loginReturnTo(search.returnTo) }),
  component: () => <RegisterPage returnTo={Route.useSearch().returnTo} />,
})
