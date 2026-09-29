import { Button } from '@astryxdesign/core/Button'
import { Spinner } from '@astryxdesign/core/Spinner'
import { useEffect, useRef } from 'react'

export function AutoLoadMore({ cursor, loading, failed, onLoadMore }: {
  cursor: string
  loading: boolean
  failed: boolean
  onLoadMore: () => Promise<void>
}) {
  const sentinel = useRef<HTMLDivElement>(null)
  const attempted = useRef<string | null>(null)
  const load = useRef(onLoadMore)
  load.current = onLoadMore

  useEffect(() => {
    if (loading || failed || attempted.current === cursor || !sentinel.current) return
    let active = true
    const observer = new IntersectionObserver((entries) => {
      if (!active || attempted.current === cursor || !entries.some((entry) => entry.isIntersecting)) return
      attempted.current = cursor
      observer.disconnect()
      void load.current()
    }, { rootMargin: '0px 0px 200px 0px' })
    observer.observe(sentinel.current)
    return () => { active = false; observer.disconnect() }
  }, [cursor, loading, failed])

  return <div ref={sentinel} data-pagination-sentinel="" style={{ minHeight: 1 }}>
    {failed ? <Button label="重试" variant="secondary" isDisabled={loading} clickAction={onLoadMore} />
      : loading && attempted.current === cursor ? <div className="pagination-loading"><Spinner size="sm" label="正在加载更多…" /></div> : null}
  </div>
}
