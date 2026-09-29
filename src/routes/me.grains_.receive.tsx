import { createFileRoute } from '@tanstack/react-router'
import { ReceiveGrainPage } from '~/features/grains/PersonalGrainActions'

export const Route = createFileRoute('/me/grains_/receive')({ component: ReceiveGrainPage })
