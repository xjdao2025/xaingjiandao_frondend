import { expect, it, vi } from 'vitest'
import { hasMoreHistory, loadPublicHistoryPage, type HistorySource } from './public-history'

it('continues both public history sources past page one, deduplicates overlap, and stops exhausted sources', async () => {
  const item = (id: number) => ({ id: String(id), inserted_at: new Date(Date.UTC(2026, 0, id)).toISOString() })
  const fetchPage = vi.fn(async (source: HistorySource, before?: string) => {
    if (source === 'created') return before
      ? { data: [item(21)], meta: { next_cursor: null } }
      : { data: Array.from({ length: 20 }, (_, index) => item(index + 1)), meta: { next_cursor: 'created-2' } }
    return before
      ? { data: [item(22)], meta: { next_cursor: null } }
      : { data: Array.from({ length: 20 }, (_, index) => item(index + 2)), meta: { next_cursor: 'participated-2' } }
  })

  const first = await loadPublicHistoryPage(fetchPage)
  expect(first.items).toHaveLength(21)
  expect(hasMoreHistory(first.cursors)).toBe(true)
  const complete = await loadPublicHistoryPage(fetchPage, first)
  expect(complete.items).toHaveLength(22)
  expect(complete.items[0].id).toBe('22')
  expect(hasMoreHistory(complete.cursors)).toBe(false)
  expect(fetchPage).toHaveBeenCalledWith('created', 'created-2')
  expect(fetchPage).toHaveBeenCalledWith('participated', 'participated-2')
  await loadPublicHistoryPage(fetchPage, complete)
  expect(fetchPage).toHaveBeenCalledTimes(4)
})

it('continues only the source that still has a cursor', async () => {
  const fetchPage = vi.fn(async (source: HistorySource, before?: string) => ({
    data: [{ id: `${source}:${before ?? 'first'}`, inserted_at: '2026-01-01T00:00:00Z' }],
    meta: { next_cursor: source === 'participated' && !before ? 'next' : null },
  }))
  const first = await loadPublicHistoryPage(fetchPage)
  await loadPublicHistoryPage(fetchPage, first)
  expect(fetchPage).toHaveBeenCalledTimes(3)
  expect(fetchPage).toHaveBeenLastCalledWith('participated', 'next')
})
