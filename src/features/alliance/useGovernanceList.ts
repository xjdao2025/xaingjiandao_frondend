import { useEffect, useRef, useState } from 'react'

import { errorMessage, mergeBy } from '~/lib/util'
import type { GovernancePage } from './api'

// Governance lists share cursor loading and reject replies from a previous filter/session.
export function useGovernanceList<T extends { id: string }>(key: string, load: (before?: string) => Promise<GovernancePage<T>>, fallback = '加载失败。') {
  const [state, setState] = useState<{ key: string; page: GovernancePage<T> | null; loading: boolean; error: string }>({ key, page: null, loading: true, error: '' })
  const [revision, setRevision] = useState(0)
  const request = useRef(0)
  const pending = useRef(false)
  useEffect(() => {
    const version = ++request.current
    pending.current = true
    setState({ key, page: null, loading: true, error: '' })
    void load().then((page) => { if (version === request.current) setState({ key, page, loading: false, error: '' }) })
      .catch((e: Error) => { if (version === request.current) setState({ key, page: null, loading: false, error: e.message }) })
      .finally(() => { if (version === request.current) pending.current = false })
    return () => { ++request.current; pending.current = false }
  }, [key, revision])
  const current = state.key === key ? state : null
  const more = async () => {
    const before = current?.page?.meta.next_cursor
    if (!before || pending.current) return
    const version = request.current
    pending.current = true; setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const page = await load(before)
      if (version === request.current) setState((s) => ({ ...s, loading: false, page: { ...page, data: mergeBy([...(s.page?.data ?? []), ...page.data], (item) => item.id) } }))
    } catch (e) { if (version === request.current) setState((s) => ({ ...s, loading: false, error: errorMessage(e, fallback) })) }
    finally { if (version === request.current) pending.current = false }
  }
  return {
    page: current?.page, loading: current?.loading ?? true, error: current?.error ?? '', more, retry: () => setRevision((v) => v + 1),
    /** Edits the loaded page in place; does nothing before it loads. */
    update: (edit: (page: GovernancePage<T>) => GovernancePage<T>) => setState((s) => s.page ? { ...s, page: edit(s.page) } : s),
    /** The current request version; a reply is stale once this changes. */
    version: () => request.current,
  }
}
