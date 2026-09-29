import { createFileRoute, Outlet } from '@tanstack/react-router'
import { LoginPage } from '~/features/session/LoginPage'
import { useStoredSession } from '~/features/session/session'

export const Route = createFileRoute('/me')({ component: MePage })

function MePage() {
  const { session, isReady } = useStoredSession()
  if (!isReady) return null
  return session ? <Outlet /> : <LoginPage />
}
