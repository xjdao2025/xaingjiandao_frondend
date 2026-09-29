import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { PublishSchedule, scheduleDateValue, scheduleMonthDays } from './PublishSchedule'

vi.mock('./PublishSteps', () => ({ usePublishValidationAttempted: () => true }))

it('uses Monday-start leap-aware months and bounds endpoint changes to valid quarter-hours', () => {
  expect(scheduleMonthDays(2024, 1).filter(Boolean)).toHaveLength(29)
  expect(scheduleMonthDays(2100, 1).filter(Boolean)).toHaveLength(28)
  expect(scheduleMonthDays(2000, 1)).toContain('2000-02-29')
  expect(scheduleMonthDays(2026, 1).slice(0, 7)).toEqual(['', '', '', '', '', '', '2026-02-01'])
  const field = { label: '申请截止', value: '2026-02-01T10:30', min: '2026-02-01T10:10', max: '2026-02-01T10:40', required: true, onChange: () => undefined }
  expect(scheduleDateValue('2026-01-30', field)).toBe('2026-02-01T10:30')
  expect(scheduleDateValue('2026-02-02', { ...field, value: '2026-02-01T23:45' })).toBe('2026-02-01T10:30')
  expect(scheduleDateValue('2026-02-01', { ...field, value: '' }, '09:00')).toBe('2026-02-01T10:15')
  expect(scheduleDateValue('2026-02-01', { ...field, min: '2026-02-01T10:16', max: '2026-02-01T10:29' })).toBe('')
  expect(scheduleDateValue('', field)).toBe('')
  const html = renderToStaticMarkup(<PublishSchedule fields={[field, { ...field, label: '交付截止', value: '2026-02-01T10:45', min: '2026-02-01T10:45', max: '2026-02-02T11:00' }, { ...field, label: '报名截止', value: '', required: false }]} />)
  const options = [...html.matchAll(/<option([^>]*)value="(\d\d:\d\d)"([^>]*)>/g)]
  expect(options).toHaveLength(96 * 3)
  expect(options.every(match => /:(00|15|30|45)$/.test(match[2]))).toBe(true)
  expect(options.slice(0, 96).filter(match => !`${match[1]}${match[3]}`.includes('disabled')).map(match => match[2])).toEqual(['10:15', '10:30'])
  expect(html).toContain('修改申请截止日期（北京时间）')
})

it('marks the missing deadline and time controls invalid after continuing', () => {
  const html = renderToStaticMarkup(<PublishSchedule fields={[{ label: '申请截止', value: '', required: true, onChange: () => undefined }]} />)
  expect(html).toContain('class="schedule-endpoint" data-invalid="true"')
  expect(html).toContain('class="schedule-time" data-invalid="true"')
  expect(html.match(/aria-invalid="true"/g)).toHaveLength(2)
})
