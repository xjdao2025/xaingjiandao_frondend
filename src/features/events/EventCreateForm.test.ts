import { expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { changeEventTime, EventCreateForm, eventDurationLabel, eventTimeError } from './EventCreateForm'
import { beijingTime } from '~/lib/date-time'
import type { RiceSession } from '~/lib/models'
import type { RiceEvent } from './api'

it('matches the event deadline and interval rules without accepting the current minute as future', () => {
  const now = beijingTime('2026-09-21T12:00') + 30_000
  const times = { application_deadline: '2026-09-21T13:00', starts_at: '2026-09-21T13:00', ends_at: '2026-09-21T14:00' }
  expect(eventTimeError(times, now)).toBeNull()
  expect(eventTimeError({ ...times, application_deadline: '2026-09-21T12:00' }, now)).toContain('晚于当前时间')
  expect(eventTimeError({ ...times, application_deadline: '2026-09-21T13:01' }, now)).toContain('报名截止不能晚于')
  expect(eventTimeError({ ...times, ends_at: times.starts_at }, now)).toContain('结束时间必须晚于')
  expect(eventTimeError({ ...times, starts_at: '' }, now)).toContain('开始日期和时间')
  expect(eventTimeError({ ...times, ends_at: '' }, now, 'application_deadline')).toBeNull()
  expect(eventTimeError({ ...times, ends_at: '' }, now, 'starts_at')).toBeNull()
  expect(eventTimeError({ ...times, ends_at: '' }, now)).toContain('结束日期和时间')
  expect(eventTimeError({ ...times, starts_at: '' }, now, 'starts_at')).toContain('开始日期和时间')
})

it('allows historical date corrections while editing but preserves chronological order', () => {
  const now = beijingTime('2026-09-29T12:00')
  const original = { application_deadline: '2026-09-28T09:00', starts_at: '2026-09-28T10:00', ends_at: '2026-09-28T13:00' }
  expect(eventTimeError(original, now, 'ends_at', true)).toBeNull()
  expect(eventTimeError({ ...original, application_deadline: '2026-09-28T09:15' }, now, 'ends_at', true)).toBeNull()
  expect(eventTimeError({ ...original, application_deadline: '2026-09-28T11:00' }, now, 'ends_at', true)).toContain('报名截止不能晚于')
  expect(eventTimeError(original, now)).toContain('晚于当前时间')
})

it('shows seven event publishing steps with separate date choices', () => {
  const html = renderToStaticMarkup(createElement(EventCreateForm, { session: { token: 'test' } as RiceSession, nodes: [], initialDraft: null, onPublished: () => undefined, onCloseStateChange: () => undefined }))
  expect(html).toContain('第 1 步，共 7 步')
  expect(html).toContain('placeholder="活动标题（必填）"')
  expect(html).toContain('placeholder="组织方联系方式（必填）"')
})

it('locks the community selector only while editing an active activity', () => {
  const select = (status: RiceEvent['status']) => {
    const draft = { id: 'event', status, node: { id: 'node', name: '社区' }, title: '活动', description: '说明', organizer_contact: '联系', location: '社区', application_deadline: '2099-01-01T09:00:00Z', starts_at: '2099-01-01T10:00:00Z', ends_at: '2099-01-01T11:00:00Z', fee_amount: 1, capacity: 5, attachments: [] } as unknown as RiceEvent
    return renderToStaticMarkup(createElement(EventCreateForm, { session: { token: 'test' } as RiceSession, nodes: [{ id: 'node', name: '社区' }], initialDraft: draft, editing: true, onPublished: () => undefined, onCloseStateChange: () => undefined })).match(/<select[^>]*>/)?.[0]
  }
  expect(select('open')).toContain('disabled')
  expect(select('cancelled')).not.toContain('disabled')
})

it('moves an overlapping start forward with the deadline and preserves duration across days', () => {
  const fields = { application_deadline: '2026-10-01T10:00', starts_at: '2026-10-01T11:00', ends_at: '2026-10-01T13:00' }
  const corrected = changeEventTime(fields, 'application_deadline', '2026-10-01T23:30', '120')
  expect(corrected).toEqual({ application_deadline: '2026-10-01T23:30', starts_at: '2026-10-01T23:30', ends_at: '2026-10-02T01:30' })
  expect(eventTimeError(corrected, beijingTime('2026-10-01T09:00'))).toBeNull()
  const moved = changeEventTime(corrected, 'starts_at', '2026-10-03T12:00', '2880')
  expect(moved.ends_at).toBe('2026-10-05T12:00')
  expect(eventDurationLabel(moved)).toBe('2 天')
  const custom = changeEventTime(moved, 'ends_at', '2026-10-05T14:15', 'custom')
  expect(eventDurationLabel(custom)).toBe('2 天 2 小时 15 分钟')
  expect(changeEventTime(custom, 'starts_at', '2026-10-04T12:00', 'custom').ends_at).toBe('2026-10-06T14:15')
})
