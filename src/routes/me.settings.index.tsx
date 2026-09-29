import { createFileRoute } from '@tanstack/react-router'

import { SettingsPage } from '~/features/account/SettingsPage'

export const Route = createFileRoute('/me/settings/')({ component: SettingsPage })
