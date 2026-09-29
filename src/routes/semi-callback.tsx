import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { redeemSemiSession } from '~/features/session/api'
import { loginReturnTo } from '~/features/session/login-redirect'
import { useStoredSession } from '~/features/session/session'
import type { RiceSession } from '~/lib/models'

export const Route = createFileRoute('/semi-callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    ticket: typeof search.ticket === 'string' ? search.ticket : '',
    error: typeof search.error === 'string' ? search.error : '',
    returnTo: loginReturnTo(search.returnTo),
  }),
  head: () => ({ meta: [{ name: 'referrer', content: 'no-referrer' }] }),
  component: SemiCallback,
})

function SemiCallback() {
  const { ticket, error: callbackError, returnTo } = Route.useSearch()
  const [error, setError] = useState(callbackError)
  const pending = useRef<Promise<RiceSession> | null>(null)
  const { saveSession } = useStoredSession()
  const navigate = useNavigate()
  useEffect(() => {
    if (callbackError) return
    let active = true
    pending.current ??= redeemSemiSession({ data: ticket })
    pending.current.then((session) => {
      if (!active) return
      saveSession(session)
      void navigate({ href: returnTo, replace: true })
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : '登录失败，请重试。')
    })
    return () => { active = false }
  }, [ticket, callbackError, returnTo, saveSession, navigate])
  return <div className="page narrow-page account-entry-page">
    <h1>Semi 登录</h1>
    {error ? <>
      <p className="form-error" role="alert">{error}</p>
      <Link to="/login" search={{ returnTo }}>返回登录</Link>
    </> : <p>正在完成登录…</p>}
  </div>
}
