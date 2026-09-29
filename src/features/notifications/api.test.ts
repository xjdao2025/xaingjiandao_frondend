import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadBusinessNotificationPage, loadSocialNotificationPage, notificationTarget, normalizeNotificationPage, normalizeNotifications, updateSeenNotifications } from './api'
import { notificationTitle } from './NotificationsPage'

afterEach(() => vi.unstubAllGlobals())

const author = { did: 'did:plc:actor', handle: 'mo.local', displayName: '小莫' }
const postUri = 'at://did:plc:poster/app.bsky.feed.post/post-1'
const interactionUri = 'at://did:plc:actor/app.bsky.feed.like/like-1'

it('accepts updateSeen empty success with PDS auth, but rejects HTTP and network failures', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 200 }))
    .mockResolvedValueOnce(Response.json({ error: 'ExpiredToken' }, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ message: '通知服务暂时不可用' }, { status: 503 }))
    .mockRejectedValueOnce(new TypeError('fetch failed'))
  vi.stubGlobal('fetch', fetch)

  await expect(updateSeenNotifications('pds-token')).resolves.toBeUndefined()
  const [url, init] = fetch.mock.calls[0]
  expect(new URL(url).pathname).toBe('/pds/xrpc/app.bsky.notification.updateSeen')
  expect(init.method).toBe('POST')
  expect(init.headers).toEqual({ Authorization: 'Bearer pds-token', 'Content-Type': 'application/json' })
  expect(Number.isFinite(Date.parse(JSON.parse(init.body).seenAt))).toBe(true)
  await expect(updateSeenNotifications('pds-token')).rejects.toThrow('登录状态已过期')
  await expect(updateSeenNotifications('pds-token')).rejects.toThrow('通知服务暂时不可用')
  await expect(updateSeenNotifications('pds-token')).rejects.toThrow()
})

function targetFor(fields: Record<string, unknown>) {
  const [notification] = normalizeNotifications({
    notifications: [{ uri: interactionUri, author, reason: 'like', ...fields }],
  })
  return notificationTarget(notification)
}

describe('notification data', () => {
  it('keeps each source cursor and sends it to the correct endpoint', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({ notifications: [{ uri: interactionUri, author, reason: 'like' }], cursor: 'next-page' }))
    vi.stubGlobal('fetch', fetchMock)
    const social = await loadSocialNotificationPage({ token: 'pds-token', cursor: 'older/social' })
    const business = await loadBusinessNotificationPage({ token: 'rice-token', cursor: 'older/business' })
    expect(social.notifications).toHaveLength(1)
    expect(business.cursor).toBe('next-page')
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('cursor')).toBe('older/social')
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('before')).toBe('older/business')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer pds-token')
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer rice-token')
    expect(normalizeNotificationPage({ notifications: [], cursor: 42 }).cursor).toBeNull()
  })
  it('distinguishes a rejected application without claiming another worker was appointed', () => {
    const [notification] = normalizeNotifications({ notifications: [{ uri: 'task-notification:1', author, reason: 'task-application_rejected', record: { text: '社区任务' } }] })
    expect(notificationTitle(notification)).toBe('小莫 拒绝了你的任务申请，本次申请未入选')
    expect(notificationTitle({ ...notification, reason: 'task-application_not_selected' })).not.toContain('任命')
  })
  it('filters unusable notifications and preserves content, actor and post references', () => {
    expect(normalizeNotifications({ notifications: [{
      uri: interactionUri, author, reason: 'like', reasonSubject: postUri,
      record: { text: '一条通知内容', subject: { uri: postUri } },
      isRead: true, indexedAt: '2026-09-01T00:00:00.000Z', taskId: 'task-1',
    }, { reason: 'like' }] })).toEqual([{
      uri: interactionUri, author, reason: 'like', reasonSubject: postUri,
      recordSubjectUri: postUri, text: '一条通知内容',
      isRead: true, indexedAt: '2026-09-01T00:00:00.000Z', taskId: 'task-1',
    }])
  })

  it('tolerates missing or malformed lists and entries', () => {
    for (const payload of [null, {}, { notifications: {} }, { notifications: [null, {}, 'invalid'] }]) {
      expect(normalizeNotifications(payload)).toEqual([])
    }
  })

})

describe('notification destinations', () => {
  it.each(['like', 'repost'])('opens the referenced post for %s, never the interaction record', (reason) => {
    const uri = `at://did:plc:actor/app.bsky.feed.${reason}/interaction-1`
    expect(targetFor({ reason, uri, reasonSubject: postUri })).toEqual({ kind: 'post', uri: postUri })
    expect(targetFor({ reason, uri, record: { subject: { uri: postUri } } })).toEqual({ kind: 'post', uri: postUri })
    expect(targetFor({ reason, uri })).toBeNull()
  })

  it('uses a valid record subject when reasonSubject is not a post', () => {
    expect(targetFor({
      reasonSubject: 'at://did:plc:actor/app.bsky.feed.generator/feed-1',
      record: { subject: { uri: postUri } },
    })).toEqual({ kind: 'post', uri: postUri })
  })

  it.each(['reply', 'mention', 'quote', 'subscribed-post'])('opens the new post for %s', (reason) => {
    expect(targetFor({ reason, uri: postUri, reasonSubject: 'at://did:plc:poster/app.bsky.feed.post/parent-1' }))
      .toEqual({ kind: 'post', uri: postUri })
  })

  it('opens the follower profile by DID, with a handle fallback', () => {
    expect(targetFor({ reason: 'follow' })).toEqual({ kind: 'profile', actor: author.did })
    expect(targetFor({ reason: 'follow', author: { handle: author.handle } })).toEqual({ kind: 'profile', actor: author.handle })
  })

  it('supports legacy task IDs and shared Rice inbox targets', () => {
    expect(targetFor({ reason: 'task-result_submitted', taskId: 'task-1' })).toEqual({ kind: 'task', id: 'task-1' })
    for (const kind of ['task', 'event', 'node']) {
      expect(targetFor({ subjectType: kind, subjectId: `${kind}-1` })).toEqual({ kind, id: `${kind}-1` })
    }
    expect(targetFor({ subjectType: 'task', subjectId: '', taskId: 'task-1' })).toEqual({ kind: 'task', id: 'task-1' })
  })

  it.each([
    { reason: 'unknown', uri: postUri },
    { reason: 'like', reasonSubject: 'https://example.test/post/1' },
    { reason: 'like', reasonSubject: interactionUri },
    { reason: 'like', record: { subject: { uri: 123 } } },
    { reason: 'reply', uri: 'at://did:plc:actor/app.bsky.feed.post/' },
    { reason: 'reply', uri: interactionUri },
    { reason: 'follow', author: { handle: 'unknown', did: 'https://example.test' } },
    { subjectType: 'event', taskId: 'task-1' },
    { subjectType: 'node', subjectId: ' ' },
    { subjectType: 'wallet', subjectId: 'wallet-1', taskId: 'task-1' },
  ])('leaves unsupported or malformed destinations unopened: %j', (fields) => {
    expect(targetFor(fields)).toBeNull()
  })
})
