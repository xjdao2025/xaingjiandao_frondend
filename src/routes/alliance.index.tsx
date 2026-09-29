import { createFileRoute } from '@tanstack/react-router'
import { AlliancePanel } from '~/features/alliance/AlliancePanel'

export const Route = createFileRoute('/alliance/')({ component: AlliancePanel })
