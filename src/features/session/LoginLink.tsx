import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export function LoginLink({ children, className, returnTo }: { children: ReactNode; className?: string; returnTo?: string }) {
  const currentHref = useRouterState({ select: (state) => state.location.href })
  return <Link to="/login" search={{ returnTo: returnTo ?? currentHref }} className={className}>{children}</Link>
}
