export const SLOT_MINUTES = 15
export const MINUTE_MS = 60_000
const SLOT_MS = SLOT_MINUTES * MINUTE_MS
const BEIJING_OFFSET_MS = 8 * 60 * MINUTE_MS

export function beijingDateTimeValue(value: string | number | Date = Date.now()) {
  return new Date(new Date(value).getTime() + BEIJING_OFFSET_MS).toISOString().slice(0, 16)
}

export function beijingTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return NaN
  const time = new Date(`${value}:00+08:00`).getTime()
  return Number.isFinite(time) && beijingDateTimeValue(time) === value ? time : NaN
}

export function nextTimeSlot(now = Date.now()) {
  return beijingDateTimeValue((Math.floor(now / SLOT_MS) + 1) * SLOT_MS)
}

export function roundedTimeValue(value: string) {
  return beijingDateTimeValue(Math.ceil(new Date(value).getTime() / SLOT_MS) * SLOT_MS)
}

export function addMinutes(value: string, minutes: number) {
  return beijingDateTimeValue(beijingTime(value) + minutes * MINUTE_MS)
}

export function beijingTimeIso(value: string) {
  return new Date(beijingTime(value)).toISOString()
}
