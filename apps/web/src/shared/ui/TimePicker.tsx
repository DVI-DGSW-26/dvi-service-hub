import { Check, Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/shared/i18n'
import { pad } from '@/shared/lib'
import { clockTime } from '@/shared/format'
import { PickerPopover } from './PickerPopover'
import { moveOption } from './moveOption'

/** 30분 간격 — 점검 일정은 정각 · 30분이면 충분하다. 다른 시각은 직접 적는다 */
const TIMES = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`)

/**
 * 적은 글을 HH:mm 으로. 비우면 '', 못 읽으면 null.
 * '9' → 09:00, '930' → 09:30, '2230' · '22:30' → 22:30, '오후 3' · '3pm' → 15:00
 */
function parseTime(text: string): string | null {
  const s = text.trim().toLowerCase()
  if (!s) return ''
  // 빠진 선택 그룹은 undefined
  const m: (string | undefined)[] | null = /^(오전|오후|am|pm)?\s*(\d{1,2})(?::?(\d{2}))?\s*(오전|오후|am|pm)?$/.exec(s)
  if (!m) return null
  const half = m[1] ?? m[4]
  let h = Number(m[2])
  const min = Number(m[3] ?? 0)
  if (half) {
    if (h < 1 || h > 12) return null
    const pm = half === '오후' || half === 'pm'
    h = (h % 12) + (pm ? 12 : 0)
  }
  if (h > 23 || min > 59) return null
  return `${pad(h)}:${pad(min)}`
}

interface TimePickerProps {
  /** HH:mm, 비어 있으면 '' */
  value: string
  onChange: (hhmm: string) => void
  /** 적은 글을 시각으로 읽지 못했을 때 true — 바르게 고치거나 비우면 false */
  onInvalidChange?: (bad: boolean) => void
  label: string
  invalid?: boolean
  /** 목록 맨 위에 '시각 없음' 을 둔다 */
  clearable?: boolean
}

/**
 * 시각 — 두 가지로 넣는다. 칸에 숫자를 바로 적거나(2230 → 오후 10:30), 시계 단추로 30분 간격 목록을 펼쳐 고른다.
 * 칸을 벗어나면 적은 글을 읽어 '오후 10:30' 처럼 보여주고, 다시 누르면 '22:30' 으로 고치기 쉽게 돌아온다.
 */
export function TimePicker({ value, onChange, onInvalidChange, label, invalid = false, clearable = false }: TimePickerProps) {
  const { t, lang } = useI18n()
  const anchor = useRef<HTMLDivElement>(null)
  const clockRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value)
  const [bad, setBad] = useState(false)
  const close = () => setOpen(false)

  // 바깥에서 값이 바뀌면(폼 비우기 등) 적던 글도 맞춘다 — 칸을 벗어날 때가 아니라 값이 바뀔 때만
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    setText(value)
    setBad(false)
  }
  useEffect(() => onInvalidChange?.(bad), [bad, onInvalidChange])

  useEffect(() => {
    if (!open) return
    const target = listRef.current?.querySelector<HTMLButtonElement>(`[data-value="${value || '09:00'}"]`)
    target?.scrollIntoView({ block: 'center' })
    target?.focus({ preventScroll: true })
  }, [open, value])

  const commit = () => {
    const parsed = parseTime(text)
    setBad(parsed === null)
    if (parsed === null) return
    setText(parsed)
    if (parsed !== value) onChange(parsed)
  }
  const pick = (v: string) => {
    setText(v)
    setBad(false)
    onChange(v)
    setOpen(false)
    clockRef.current?.focus()
  }
  // 직접 적은 시각(22:15 등)도 목록에서 고른 줄로 보이게 끼워 넣는다
  const times = value && !TIMES.includes(value) ? [...TIMES, value].sort() : TIMES
  const shown = editing || bad ? text : value ? clockTime(value, lang) : ''
  const option = (selected: boolean) =>
    `flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-[15px] tabular-nums transition-colors focus-visible:outline-offset-[-2px] ${
      selected ? 'bg-accent-soft font-bold text-accent' : 'hover:bg-subtle'
    }`

  return (
    <>
      <div
        ref={anchor}
        aria-invalid={invalid || bad || undefined}
        className="flex w-full items-center rounded-xl bg-subtle ring-1 ring-line transition-[box-shadow,background-color] duration-200 focus-within:bg-raised focus-within:ring-2 focus-within:ring-accent aria-invalid:ring-2 aria-invalid:ring-danger"
      >
        <input
          value={shown}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => {
            setEditing(true)
            if (!bad) setText(value)
            // 고치기 쉽게 통째로 골라 둔다
            requestAnimationFrame(() => e.target.select())
          }}
          onBlur={() => {
            setEditing(false)
            commit()
          }}
          onKeyDown={(e) => {
            // Enter 는 폼을 보내지 않고 적은 시각만 확정한다
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'ArrowDown' && e.altKey) {
              e.preventDefault()
              setOpen(true)
            }
          }}
          inputMode="numeric"
          autoComplete="off"
          placeholder={t.common.picker.timePlaceholder}
          aria-label={label}
          aria-invalid={invalid || bad || undefined}
          className="min-w-0 flex-1 bg-transparent py-2.5 pl-3.5 text-[15px] text-fg tabular-nums outline-none placeholder:text-muted"
        />
        <button
          ref={clockRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t.common.picker.timeList}
          title={t.common.picker.timeList}
          className="mr-1 grid size-9 flex-none cursor-pointer place-items-center rounded-lg text-muted transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-fg active:scale-90"
        >
          <Clock className="size-[18px]" aria-hidden="true" />
        </button>
      </div>

      <PickerPopover open={open} anchor={anchor} onClose={close} label={label} returnFocus={clockRef} className="w-48 p-1.5">
        {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- 초점은 안의 항목 단추가 받는다(화살표로 옮긴다) */}
        <div ref={listRef} role="listbox" aria-label={label} onKeyDown={(e) => moveOption(e, listRef.current)} className="max-h-64 overflow-y-auto overscroll-contain">
          {clearable && (
            <button type="button" role="option" aria-selected={!value} data-value="" onClick={() => pick('')} className={`${option(!value)} text-muted`}>
              {t.common.picker.noTime}
              {!value && <Check className="size-4" aria-hidden="true" />}
            </button>
          )}
          {times.map((v) => (
            <button key={v} type="button" role="option" aria-selected={v === value} data-value={v} onClick={() => pick(v)} className={option(v === value)}>
              {clockTime(v, lang)}
              {v === value && <Check className="size-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </PickerPopover>
    </>
  )
}
