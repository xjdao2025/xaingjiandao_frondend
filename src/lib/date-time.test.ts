import { expect, it } from 'vitest'
import { addMinutes, beijingDateTimeValue, beijingTime, beijingTimeIso, nextTimeSlot, roundedTimeValue } from './date-time'

it('round-trips Beijing inputs independently of the computer timezone and advances to a quarter-hour', () => {
  expect(beijingTimeIso('2026-10-01T08:00')).toBe('2026-10-01T00:00:00.000Z')
  expect(beijingDateTimeValue('2026-10-01T00:00:00.000Z')).toBe('2026-10-01T08:00')
  expect(nextTimeSlot(beijingTime('2026-10-01T08:00'))).toBe('2026-10-01T08:15')
  expect(nextTimeSlot(beijingTime('2026-10-01T23:59'))).toBe('2026-10-02T00:00')
  expect(roundedTimeValue('2026-10-01T00:13:00Z')).toBe('2026-10-01T08:15')
  expect(addMinutes('2026-10-01T23:30', 120)).toBe('2026-10-02T01:30')
  expect(Number.isNaN(beijingTime('2026-02-30T08:00'))).toBe(true)
})
