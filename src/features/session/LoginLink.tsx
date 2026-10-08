import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export function LoginLink({ children, className, returnTo }: { children: ReactNode; className?: string; returnTo?: string }) {
  const currentHref = useRouterState({ select: (state) => state.location.href })
  return <Link to="/login" search={{ returnTo: returnTo ?? currentHref }} className={className}>{children}</Link>
}

export function SignedOutState({ title, icon, children }: { title: string; icon?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page signed-out-state">
      {icon}
      <strong>{title}</strong>
      {children}
      <LoginLink className="primary-link">前往登录</LoginLink>
    </div>
  )
}
