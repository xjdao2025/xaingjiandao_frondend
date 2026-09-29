import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/profile/$actor')({
  component: () => <Outlet />,
})
