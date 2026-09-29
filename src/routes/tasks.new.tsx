import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/tasks/new')({
  beforeLoad: () => {
    throw redirect({ to: '/compose', search: { kind: 'task' } })
  },
})
