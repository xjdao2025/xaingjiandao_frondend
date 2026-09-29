import { useEffect, useState } from 'react'

// Re-render at the next deadline instead of polling every card each second.
export function useTimeBoundary(dates: Array<string | null | undefined>) {
  const [now, setNow] = useState(Date.now)
  const next = Math.min(...dates.map((date) => date ? Date.parse(date) : NaN).filter((time) => time > now))
  useEffect(() => {
    if (!Number.isFinite(next)) return
    const refresh = () => setNow(Date.now())
    const timer = window.setTimeout(refresh, Math.min(Math.max(0, next - Date.now() + 1), 2_147_483_647))
    window.addEventListener('focus', refresh)
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', refresh) }
  }, [next, now])
  return now
}
