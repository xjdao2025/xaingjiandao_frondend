import { createFileRoute } from '@tanstack/react-router'

import { AccountSecurityPage } from '~/features/account/AccountSecurityPage'

export const Route = createFileRoute('/me/settings/account')({ component: AccountSecurityPage })
