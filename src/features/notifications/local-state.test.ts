import { afterEach, expect, it, vi } from 'vitest'
import type { NotificationView } from '~/lib/models'
import { applyNotificationState, mergeNotificationRows, saveNotificationState } from './local-state'

afterEach(() => vi.unstubAllGlobals())

const unread = { uri: 'message-1', reason: 'reply', author: { handle: 'actor.test' }, text: '', indexedAt: '2026-09-21T00:00:00Z', isRead: false } satisfies NotificationView

it('merges paginated notifications by source and record without duplicate rows', () => {
  const business = { ...unread, subjectType: 'event', subjectId: 'event-1' }
  const older = { ...unread, uri: 'message-2', indexedAt: '2026-09-20T00:00:00Z' }
  expect(mergeNotificationRows([unread], [older, business, unread])).toEqual([unread, business, older])
})

it('keeps precise reads and cleared messages across reopening, isolated by account and source', () => {
  const storage = new Map<string, string>()
  vi.stubGlobal('window', {
    localStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) },
    dispatchEvent: vi.fn(),
  })
  const rows = [unread, { ...unread, subjectType: 'event', subjectId: 'event-1' }, { ...unread, uri: 'message-2', isRead: true }]
  saveNotificationState('alice', [rows[0]], 'read')
  expect(applyNotificationState('alice', rows).map((row) => row.isRead)).toEqual([true, false, true])
  expect(applyNotificationState('bob', rows)).toEqual(rows)
  saveNotificationState('alice', applyNotificationState('alice', rows).filter((row) => row.isRead), 'hidden')
  expect(applyNotificationState('alice', rows)).toEqual([rows[1]])
  expect(applyNotificationState('bob', rows)).toEqual(rows)
})

it('does not clear messages or emit success when browser storage refuses the write', () => {
  const dispatchEvent = vi.fn()
  vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem: () => { throw new Error('Storage full') } }, dispatchEvent })
  const read = { ...unread, isRead: true }
  expect(() => saveNotificationState('alice', [read], 'hidden')).toThrow('Storage full')
  expect(applyNotificationState('alice', [read])).toEqual([read])
  expect(dispatchEvent).not.toHaveBeenCalled()
})
