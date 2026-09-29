import { createFileRoute } from '@tanstack/react-router'

import { GrainHistoryPage } from '~/features/grains/GrainHistoryPage'

export const Route = createFileRoute('/me/grains')({ component: GrainHistoryPage })
