import { createFileRoute } from '@tanstack/react-router'

import { ProfileEditPage } from '~/features/account/ProfileEditPage'

export const Route = createFileRoute('/me/settings/profile')({ component: ProfileEditPage })
