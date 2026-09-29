import { describe, expect, it } from 'vitest'

import { authorDisplayName, formatTimestamp } from './format'

describe('timestamp formatting', () => {
  it('shows the complete Beijing date and time', () => {
    expect(formatTimestamp('2026-09-28T08:02:00.000Z')).toBe('2026-09-28 16:02')
    expect(formatTimestamp('2026-09-27T16:02:00.000Z')).toBe('2026-09-28 00:02')
  })
})

describe('author formatting', () => {
  it('prefers a display name and otherwise shortens the handle', () => {
    expect(authorDisplayName({ handle: 'mo-alice.local', displayName: 'Alice' }))
      .toBe('Alice')
    expect(authorDisplayName({ handle: 'mo-bob.local' })).toBe('mo-bob')
  })
})
