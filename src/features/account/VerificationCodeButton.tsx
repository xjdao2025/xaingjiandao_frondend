import { Button } from '@astryxdesign/core/Button'
import { useEffect, useRef, useState } from 'react'

import { sendVerificationCode, type VerificationChannel, type VerificationPurpose } from './api'

type Props = {
  channel: VerificationChannel
  contact: string
  phoneRegion?: string
  purpose: VerificationPurpose
  disabled?: boolean
  onError: (message: string) => void
  onSent?: () => void
}

export function VerificationCodeButton({ channel, contact, phoneRegion = '86', purpose, disabled, onError, onSent }: Props) {
  const target = contact.trim().toLowerCase()
  const key = `xiangjian.verification:${channel}:${channel === 'sms' ? phoneRegion : ''}:${target}`
  const [cooldown, setCooldown] = useState({ key: '', until: 0 })
  const [now, setNow] = useState(0)
  const [sending, setSending] = useState(false)
  const inFlight = useRef(false)
  const currentKey = useRef(key)
  currentKey.current = key
  const remaining = cooldown.key === key ? Math.max(0, Math.ceil((cooldown.until - now) / 1000)) : 0

  useEffect(() => {
    let until = 0
    try { until = Number(sessionStorage.getItem(key)) || 0 } catch { /* 服务端仍负责限流。 */ }
    setCooldown({ key, until })
    setNow(Date.now())
  }, [key])

  useEffect(() => {
    if (cooldown.until <= Date.now()) return
    const timer = window.setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (time >= cooldown.until) {
        window.clearInterval(timer)
        try { sessionStorage.removeItem(cooldown.key) } catch { /* 无需持久化过期倒计时。 */ }
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const send = async () => {
    if (inFlight.current || disabled || !target || remaining > 0) return
    inFlight.current = true
    setSending(true)
    onError('')
    try {
      const result = await sendVerificationCode({ data: {
        channel, purpose,
        ...(channel === 'sms' ? { phone: target, phoneRegion } : { email: target }),
      } })
      const time = Date.now()
      const until = time + result.retryAfter * 1000
      try { sessionStorage.setItem(key, String(until)) } catch { /* 服务端仍负责限流。 */ }
      if (currentKey.current !== key) return
      setCooldown({ key, until })
      setNow(time)
      if (result.sent) onSent?.()
      else onError(`发送太频繁，请 ${result.retryAfter} 秒后重试。`)
    } catch (reason) {
      if (currentKey.current === key) onError(reason instanceof Error ? reason.message : '验证码发送失败')
    } finally {
      inFlight.current = false
      setSending(false)
    }
  }

  return <Button
    label={sending ? '发送中…' : remaining > 0 ? `${remaining} 秒后重发` : '获取验证码'}
    variant="secondary"
    size="lg"
    clickAction={send}
    isDisabled={disabled || sending || !target || remaining > 0}
  />
}
