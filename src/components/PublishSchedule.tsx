import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { nextTimeSlot, SLOT_MINUTES } from '~/lib/date-time'
import { usePublishValidationAttempted } from './PublishSteps'

type ScheduleField = { label: string; value: string; min?: string; max?: string; required?: boolean; onChange: (value: string) => void }
const MIN_YEAR = 1000
const MAX_YEAR = 9999
const times = Array.from({ length: 24 * 60 / SLOT_MINUTES }, (_, index) => `${String(Math.floor(index * SLOT_MINUTES / 60)).padStart(2, '0')}:${String(index * SLOT_MINUTES % 60).padStart(2, '0')}`)
const validSlot = (day: string, slot: string, field: Pick<ScheduleField, 'min' | 'max'>) => (!field.min || `${day}T${slot}` >= field.min) && (!field.max || `${day}T${slot}` <= field.max)
const weekday = (day: string) => `周${'日一二三四五六'[new Date(`${day}T12:00:00`).getDay()]}`

export function scheduleMonthDays(year: number, month: number) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, cell) => {
    const day = cell - offset + 1
    return day < 1 || day > count ? '' : `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  })
}

export function scheduleDateValue(day: string, field: Pick<ScheduleField, 'value' | 'min' | 'max'>, fallback = nextTimeSlot().slice(11)) {
  if (!day) return ''
  const bounded = day < (field.min?.slice(0, 10) ?? '') ? field.min!.slice(0, 10) : field.max && day > field.max.slice(0, 10) ? field.max.slice(0, 10) : day
  const available = times.filter(slot => validSlot(bounded, slot, field))
  const preferred = field.value.slice(11) || fallback
  const slot = available.find(item => item >= preferred) ?? available.at(-1)
  return slot ? `${bounded}T${slot}` : ''
}

export function PublishSchedule({ fields, disabled = false, children }: { fields: ScheduleField[]; disabled?: boolean; children?: ReactNode }) {
  const validationAttempted = usePublishValidationAttempted()
  const initial = fields.find(field => field.value)?.value || nextTimeSlot()
  const [month, setMonth] = useState(() => new Date(`${initial.slice(0, 7)}-01T12:00:00`))
  const [active, setActive] = useState(0)
  const [jump, setJump] = useState(false)
  const [jumpYear, setJumpYear] = useState(String(month.getFullYear()))
  const jumpId = useId()
  const jumpButton = useRef<HTMLButtonElement>(null)
  const field = fields[Math.min(active, fields.length - 1)]
  const year = month.getFullYear(), monthIndex = month.getMonth()
  const validYear = /^\d{4}$/.test(jumpYear) && Number(jumpYear) >= MIN_YEAR && Number(jumpYear) <= MAX_YEAR
  const dates = fields.map(item => item.value.slice(0, 10))
  const ordered = dates.filter(Boolean).sort()
  const start = ordered[0], end = ordered.at(-1)
  const changeMonth = (delta: number) => setMonth(new Date(year, monthIndex + delta, 1, 12))
  const chooseEndpoint = (index: number) => {
    setActive(index)
    if (dates[index]) setMonth(new Date(`${dates[index].slice(0, 7)}-01T12:00:00`))
    setJump(false)
  }
  const isInvalid = (item: ScheduleField) => validationAttempted && (
    (item.required && !item.value) ||
    (!!item.value && ((!!item.min && item.value < item.min) || (!!item.max && item.value > item.max)))
  )
  if (!field) return null

  return <div className="publish-schedule">
    <div className="schedule-endpoints" data-count={fields.length}>
      {fields.map((item, index) => {
        const [date = '', time = ''] = item.value.split('T')
        return <div className="schedule-endpoint" key={item.label} data-invalid={isInvalid(item) || undefined}>
          <button type="button" className="endpoint" aria-label={`修改${item.label}日期（北京时间）`} aria-pressed={active === index} aria-invalid={isInvalid(item) || undefined} disabled={disabled} onClick={() => chooseEndpoint(index)}>
            <span>{item.label}</span><strong>{date ? <><span className="schedule-year">{date.slice(0, 4)} / </span>{date.slice(5).replace('-', ' / ')}</> : '选择日期'}</strong><small>{date ? `${weekday(date)} ${time}` : '点下方月历'}</small>
          </button>
        </div>
      })}
    </div>
    <div className="schedule-calendar">
      <div className="month-head">
        <button ref={jumpButton} type="button" className="month-label" aria-expanded={jump} aria-controls={jumpId} disabled={disabled} onClick={() => { setJumpYear(String(year)); setJump(!jump) }}>{year} 年 {monthIndex + 1} 月 <ChevronDown size={16} aria-hidden="true" /></button>
        {!jump && <div className="arrows">
          <button type="button" className="arrow" aria-label="上个月" disabled={disabled || year === MIN_YEAR && monthIndex === 0} onClick={() => changeMonth(-1)}><ChevronLeft size={22} aria-hidden="true" /></button>
          <button type="button" className="arrow" aria-label="下个月" disabled={disabled || year === MAX_YEAR && monthIndex === 11} onClick={() => changeMonth(1)}><ChevronRight size={22} aria-hidden="true" /></button>
        </div>}
      </div>
      {jump ? <div className="schedule-jump" id={jumpId}>
        <div className="year-row">
          <button type="button" className="arrow" aria-label="上一年" disabled={disabled || !validYear || Number(jumpYear) === MIN_YEAR} onClick={() => setJumpYear(String(Number(jumpYear) - 1))}><ChevronLeft size={22} aria-hidden="true" /></button>
          <label className="year-input"><input type="number" min={MIN_YEAR} max={MAX_YEAR} step="1" aria-label="跳转年份" aria-invalid={!validYear} value={jumpYear} disabled={disabled} onChange={event => setJumpYear(event.target.value)} /><span>年</span></label>
          <button type="button" className="arrow" aria-label="下一年" disabled={disabled || !validYear || Number(jumpYear) === MAX_YEAR} onClick={() => setJumpYear(String(Number(jumpYear) + 1))}><ChevronRight size={22} aria-hidden="true" /></button>
        </div>
        <div className="months">{Array.from({ length: 12 }, (_, index) => <button type="button" key={index} aria-pressed={Number(jumpYear) === year && index === monthIndex} disabled={disabled || !validYear} onClick={() => { setMonth(new Date(Number(jumpYear), index, 1, 12)); setJump(false); jumpButton.current?.focus() }}>{index + 1} 月</button>)}</div>
        {!validYear && <p className="form-error" role="alert">请输入 {MIN_YEAR} 至 {MAX_YEAR} 的完整四位年份。</p>}
      </div> : <>
        <div className="week" aria-hidden="true">{'一二三四五六日'.split('').map(day => <span key={day}>{day}</span>)}</div>
        <div className="days" role="group" aria-label={`${year} 年 ${monthIndex + 1} 月日期`}>
          {scheduleMonthDays(year, monthIndex).map((day, index) => day ? <button key={day} type="button" className={['day', start && end && start < end && day >= start && day <= end ? 'in-range' : '', day === start ? 'start' : '', day === end ? 'end' : '', dates.includes(day) ? 'selected' : ''].filter(Boolean).join(' ')} aria-pressed={dates.includes(day)} aria-label={`${day.replaceAll('-', ' / ')} ${weekday(day)}${fields.filter(item => item.value.startsWith(day)).map(item => `，${item.label}`).join('')}`} disabled={disabled || !times.some(slot => validSlot(day, slot, field))} onClick={() => {
            const value = scheduleDateValue(day, field)
            if (value) { field.onChange(value); setActive(Math.min(active + 1, fields.length - 1)) }
          }}><span>{Number(day.slice(-2))}</span></button> : <span key={index} className="blank" aria-hidden="true" />)}
        </div>
      </>}
    </div>
    <div className="schedule-times" data-count={fields.length}>
      {fields.map(item => {
        const [date = '', time = ''] = item.value.split('T')
        return <div className="schedule-time" key={item.label} data-invalid={isInvalid(item) || undefined}>
          <label><small>{item.label}</small><select aria-label={`${item.label}时刻（北京时间）`} aria-invalid={isInvalid(item) || undefined} value={time} required={item.required} disabled={disabled || !date} onChange={event => item.onChange(`${date}T${event.target.value}`)}>
            {!time && <option value="">选择时间</option>}
            {time && !times.includes(time) && <option value={time}>{time}</option>}
            {times.map(slot => <option key={slot} value={slot} disabled={!validSlot(date, slot, item)}>{slot}</option>)}
          </select></label>
          {!item.required && <button type="button" className="schedule-clear" aria-label={`${item.label}不设截止`} disabled={disabled || !date} onClick={() => item.onChange('')}>不设截止</button>}
        </div>
      })}
    </div>
    {children}
  </div>
}
