import { useEffect, useRef, useState } from 'react'

type Page<Row> = { data: Row[]; meta?: { next_cursor?: string | null } }
type List<Row> = { rows: Row[]; cursor: string | null }

export function appendPage<Row extends { id: string }>(current: List<Row>, page: Page<Row>): List<Row> {
  return {
    rows: [...new Map([...current.rows, ...page.data].map((row) => [row.id, row])).values()],
    cursor: page.meta?.next_cursor ?? null,
  }
}

export function usePagedBusinessList<Row extends { id: string }>({
  initialPage, useRoutePage, isReady, disabled, refreshError, loadPage,
}: {
  initialPage?: Page<Row>
  useRoutePage: boolean
  isReady: boolean
  disabled: boolean
  refreshError: string
  loadPage: (before?: string) => Promise<Page<Row>>
}) {
  const [list, setList] = useState<List<Row>>({ rows: initialPage?.data ?? [], cursor: initialPage?.meta?.next_cursor ?? null })
  const [loading, setLoading] = useState(!initialPage)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const request = useRef(0)
  const routePage = useRef(initialPage)
  const paginated = useRef(false)

  useEffect(() => {
    if (useRoutePage) return
    const reload = () => setRefresh((value) => value + 1)
    window.addEventListener('rice-changed', reload)
    return () => window.removeEventListener('rice-changed', reload)
  }, [useRoutePage])

  useEffect(() => {
    if (routePage.current === initialPage) return
    routePage.current = initialPage
    if (!initialPage || !useRoutePage) return
    setList((current) => {
      if (!paginated.current) return { rows: initialPage.data, cursor: initialPage.meta?.next_cursor ?? null }
      const ids = new Set(initialPage.data.map((row) => row.id))
      return { ...current, rows: [...initialPage.data, ...current.rows.filter((row) => !ids.has(row.id))] }
    })
  }, [initialPage, useRoutePage])

  useEffect(() => {
    const current = ++request.current
    if (!isReady) return
    paginated.current = false
    if (disabled || (useRoutePage && routePage.current)) {
      setList({ rows: disabled ? [] : routePage.current?.data ?? [], cursor: disabled ? null : routePage.current?.meta?.next_cursor ?? null })
      setLoading(false)
      setError('')
      return () => { ++request.current }
    }
    setLoading(true)
    setError('')
    setList((current) => ({ ...current, cursor: null }))
    void loadPage().then((page) => {
      if (current !== request.current) return
      setList({ rows: page.data, cursor: page.meta?.next_cursor ?? null })
    }).catch((reason) => {
      if (current === request.current) setError(reason instanceof Error ? reason.message : '加载失败')
    }).finally(() => {
      if (current === request.current) setLoading(false)
    })
    return () => { ++request.current }
  }, [isReady, disabled, useRoutePage, loadPage, refresh])

  const more = async () => {
    if (!list.cursor || loading) return
    const current = request.current
    paginated.current = true
    setLoading(true)
    setError('')
    try {
      const page = await loadPage(list.cursor)
      if (current !== request.current) return
      setList((existing) => appendPage(existing, page))
    } catch (reason) {
      if (current === request.current) setError(reason instanceof Error ? reason.message : '加载失败')
    } finally {
      if (current === request.current) setLoading(false)
    }
  }

  return { ...list, loading, error, visibleError: error || (useRoutePage ? refreshError : ''), more }
}
