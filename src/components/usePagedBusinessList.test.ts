import { expect, it } from 'vitest'
import { appendPage } from './usePagedBusinessList'

it('appends a page once per id, uses its latest value and advances the cursor', () => {
  const first = appendPage(
    { rows: [{ id: 'a', value: 1 }, { id: 'b', value: 1 }], cursor: 'first' },
    { data: [{ id: 'b', value: 2 }, { id: 'c', value: 3 }], meta: { next_cursor: 'second' } },
  )
  expect(first).toEqual({ rows: [{ id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 }], cursor: 'second' })
  expect(appendPage(first, { data: [], meta: { next_cursor: null } }).cursor).toBeNull()
})
