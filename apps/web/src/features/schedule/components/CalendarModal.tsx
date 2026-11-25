import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { useI18n } from '@/shared/i18n'
import { addMonths, eventsOn, fromIso, inMonth, monthKey, monthOf, monthTitle, type Month } from '@/shared/lib'
import { project, settle, snap, spring, step, motionOff } from '@/shared/lib'
import { DRAG_START, VELOCITY_WINDOW } from '@/shared/constants'
import { longToday, shortDate, useTitle } from '@/shared/format'
import { calendarQueries } from '../api/queries'
import type { CalendarEvent } from '@/shared/types'
import { Modal } from '@/shared/ui'
import { EventDot, MonthGrid, WeekdayRow } from './MonthGrid'

interface CalendarModalProps {
  open: boolean
  /** 열 때 고를 날짜 (YYYY-MM-DD) — 그 달로 연다 */
  start: string
  today: string
  onClose: () => void
}

type Dir = -1 | 1

/** 가로 휠(트랙패드)을 이만큼 굴리면 한 달 넘긴다 */
const WHEEL_STEP = 60

/**
 * 달 넘기기. 이전 · 이번 · 다음 달 세 장을 가로로 늘어놓고 손가락(마우스)을 따라 민다.
 * 놓을 때 속도까지 셈해 반 장을 넘으면 옆 달로, 아니면 제자리로 스프링이 데려간다.
 * 옆 달에 닿으면 달을 바꾸고 세 장을 다시 가운데로 맞춘다 — 같은 프레임이라 화면은 움직이지 않는다.
 * 매 프레임은 React 를 거치지 않고 style 만 바꾼다.
 *
 * ← → 키는 keyboard 가 켜져 있는 동안 문서 전체에서 받는다. 달력 안에서만 받으면 날짜 칸을 누른 뒤
 * 넘길 때 그 칸이 옆 달(inert)로 밀려나 초점이 사라지고, 그다음 키부터는 아무 데도 닿지 않는다.
 */
function useMonthSwipe(onCommit: (dir: Dir) => void, keyboard: boolean) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const s = useRef(spring(0))
  const raf = useRef(0)
  /** 지금 넘어가는 중인 방향 (0: 제자리로) */
  const pending = useRef<0 | Dir>(0)
  const drag = useRef<{ id: number; x0: number; y0: number; from: number; live: boolean; history: { t: number; p: number }[] } | null>(null)
  /** 방금 끌기를 마쳤으면 이어지는 클릭(날짜 고르기)을 먹는다 */
  const dragged = useRef(false)
  const wheel = useRef({ sum: 0, lockUntil: 0 })
  const commitRef = useRef(onCommit)

  useLayoutEffect(() => {
    commitRef.current = onCommit
  })
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 숨겨져 폭이 0 이어도 1 (넘김 거리가 0 이 되지 않게)
  const width = () => viewportRef.current?.clientWidth || 1
  const paint = () => {
    if (trackRef.current) trackRef.current.style.transform = `translate3d(calc(-100% + ${s.current.x}px),0,0)`
  }

  /** 옆 달로 바꾸고 그만큼 되돌려 놓는다 — 달리던 중이면 그 자리 · 속도 그대로 이어 간다 */
  const commit = (dir: Dir) => {
    const w = width()
    pending.current = 0
    s.current.to += dir * w
    // 연달아 넘기면 세 장 밖(빈 곳)까지 밀릴 수 있어 옆 달 자리까지만 둔다
    s.current.x = Math.max(-w, Math.min(w, s.current.x + dir * w))
    flushSync(() => commitRef.current(dir))
    paint()
  }

  const run = () => {
    cancelAnimationFrame(raf.current)
    let last = performance.now()
    const tick = (now: number) => {
      step(s.current, Math.min(0.064, (now - last) / 1000), 1, 0.4)
      last = now
      if (settle(s.current, 0.5)) {
        if (pending.current) commit(pending.current)
        paint()
        return
      }
      paint()
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  const go = (dir: Dir) => {
    if (pending.current) commit(pending.current)
    if (motionOff()) {
      commit(dir)
      snap(s.current, 0)
      paint()
      return
    }
    pending.current = dir
    s.current.to = -dir * width()
    run()
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    dragged.current = false
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, from: s.current.x, live: false, history: [] }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (d?.id !== e.pointerId) return
    const dx = e.clientX - d.x0
    if (!d.live) {
      if (Math.abs(e.clientY - d.y0) > DRAG_START && Math.abs(e.clientY - d.y0) > Math.abs(dx)) drag.current = null // 세로 스크롤
      if (Math.abs(dx) <= DRAG_START || !drag.current) return
      d.live = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      cancelAnimationFrame(raf.current)
      // 넘어가던 중에 잡으면 그 달을 먼저 확정하고 지금 자리에서 잇는다
      if (pending.current) commit(pending.current)
      d.from = s.current.x - dx
    }
    const w = width()
    s.current.x = s.current.to = Math.max(-w, Math.min(w, d.from + dx))
    s.current.v = 0
    d.history.push({ t: e.timeStamp, p: e.clientX })
    paint()
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    const d = drag.current
    if (d?.id !== e.pointerId) return
    drag.current = null
    if (!d.live) return
    dragged.current = true
    const recent = d.history.filter((h) => e.timeStamp - h.t <= VELOCITY_WINDOW)
    const last = recent[recent.length - 1]
    const v = recent.length > 1 ? ((last.p - recent[0].p) / (last.t - recent[0].t || 1)) * 1000 : 0
    const w = width()
    const landing = s.current.x + project(v)
    const dir: 0 | Dir = landing < -w / 2 ? 1 : landing > w / 2 ? -1 : 0
    if (motionOff()) {
      if (dir) commit(dir)
      snap(s.current, 0)
      paint()
      return
    }
    s.current.v = v
    pending.current = dir
    s.current.to = -dir * w
    run()
  }

  const onClickCapture = (e: ReactMouseEvent) => {
    if (!dragged.current) return
    dragged.current = false
    e.stopPropagation()
    e.preventDefault()
  }

  // go 는 ref 만 다루므로 처음 만든 것을 계속 써도 된다
  useEffect(() => {
    if (!keyboard) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      if ((e.target as Partial<HTMLElement>).closest?.('input, textarea, select, [contenteditable]')) return
      e.preventDefault()
      go(e.key === 'ArrowLeft' ? -1 : 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go 는 ref 만 다뤄 처음 것으로 충분하다. 넣으면 렌더마다 다시 건다
  }, [keyboard])

  // 트랙패드 가로 밀기 — 한 번 밀면 잠깐 잠가서 관성으로 여러 달이 넘어가지 않게 한다
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      const w = wheel.current
      if (e.timeStamp < w.lockUntil) return
      w.sum += e.deltaX
      if (Math.abs(w.sum) < WHEEL_STEP) return
      go(w.sum > 0 ? 1 : -1)
      w.sum = 0
      w.lockUntil = e.timeStamp + 450
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  return {
    viewportRef,
    trackRef,
    go,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
  }
}

/**
 * 회사 캘린더 크게 보기. 달력 칸마다 일정 이름을 보여주고, 좌우로 밀거나 ← → 키 · 버튼으로 달을 넘긴다.
 * 오른쪽(좁은 화면은 아래)에는 고른 날짜와 그달 전체 목록 — 칸에 다 못 담은 이름도 여기서 본다.
 */
export function CalendarModal({ open, start, today, onClose }: CalendarModalProps) {
  const titleId = useId()
  const { t, f, lang, locale } = useI18n()
  const title = useTitle()
  const [month, setMonth] = useState(() => monthOf(fromIso(start)))
  const [selected, setSelected] = useState(start)
  // 세 장(앞 · 이번 · 다음 달)이 각자 받은 것과 같은 캐시다. 닫힌 뒤에도 붙어 있어 열려 있을 때만 받는다
  const { data } = useQuery({ ...calendarQueries.month(monthKey(month)), enabled: open })
  const events = data ?? []
  const dayItems = eventsOn(events, selected)

  const { go, viewportRef, trackRef, bind } = useMonthSwipe((dir) => {
    const next = addMonths(month, dir)
    setMonth(next)
    // 고른 날이 새 달에 없으면 — 오늘이 그 달이면 오늘, 아니면 1일
    setSelected((s) => (inMonth(s, next) ? s : inMonth(today, next) ? today : `${monthKey(next)}-01`))
  }, open)

  const select = (iso: string) => {
    setSelected(iso)
    // 앞뒤 달 칸을 누르면 그 달로 넘긴다
    if (!inMonth(iso, month)) go(iso < monthKey(month) ? -1 : 1)
  }

  const goToday = () => {
    const target = monthOf(fromIso(today))
    const diff = (target.y - month.y) * 12 + (target.m - month.m)
    if (Math.abs(diff) === 1) go(diff as Dir)
    else if (diff) setMonth(target)
    setSelected(today)
  }

  const counts = f(t.calendar.eventCount, { count: events.length })
  const arrow =
    'grid size-11 flex-none cursor-pointer place-items-center rounded-xl text-fg ring-1 ring-line transition-[background-color,scale] duration-150 hover:bg-subtle active:scale-90'
  // 넓은 화면은 제목 옆, 휴대폰 시트는 맨 아래(엄지 자리)에 같은 버튼을 둔다
  const prevButton = (
    <button type="button" onClick={() => go(-1)} aria-label={t.calendar.prev} className={arrow}>
      <ChevronLeft className="size-5" aria-hidden="true" />
    </button>
  )
  const nextButton = (
    <button type="button" onClick={() => go(1)} aria-label={t.calendar.next} className={arrow}>
      <ChevronRight className="size-5" aria-hidden="true" />
    </button>
  )
  // 오늘이 있는 달로 가서 오늘을 고른다
  const todayButton = (
    <button
      type="button"
      onClick={goToday}
      className="h-11 cursor-pointer rounded-xl px-4 text-[15px] font-semibold ring-1 ring-line transition-[background-color,scale] duration-150 hover:bg-subtle active:scale-95"
    >
      {t.calendar.today}
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} full>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-none flex-wrap items-end justify-between gap-4 border-b border-line p-5 pr-16 sm:p-7 sm:pr-20">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-accent">
              {t.calendar.title} · {t.calendar.today} {longToday(fromIso(today), lang)}
            </p>
            <h2 id={titleId} className="mt-1.5 text-[clamp(22px,2.4vw,30px)]/[1.3] font-bold tracking-[-0.025em]" aria-live="polite">
              {monthTitle(month, locale)}
            </h2>
            <p className="mt-1 text-base text-muted">{counts}</p>
          </div>
          <div className="flex items-center gap-2 max-sm:hidden">
            {todayButton}
            {prevButton}
            {nextButton}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col @3xl:flex-row">
          <div className="flex h-[58%] flex-none flex-col px-2 pt-3 pb-2 sm:px-5 @3xl:h-auto @3xl:flex-1">
            <WeekdayRow className="mb-2" />
            {/* 세로 스크롤은 브라우저에, 가로 밀기는 여기서 */}
            <div ref={viewportRef} className="min-h-0 flex-1 touch-pan-y overflow-hidden select-none" {...bind}>
              <div ref={trackRef} className="flex h-full" style={{ transform: 'translate3d(-100%,0,0)' }}>
                {([-1, 0, 1] as const).map((offset) => {
                  const m = addMonths(month, offset)
                  return (
                    <MonthPane
                      key={monthKey(m)}
                      month={m}
                      today={today}
                      selected={selected}
                      onSelect={select}
                      // 옆 달은 넘기는 동안 보이기만 한다 — Tab 으로 들어가지 않게
                      inert={offset !== 0}
                      enabled={open}
                    />
                  )
                })}
              </div>
            </div>
            <p className="mt-2 hidden text-center text-[13px] text-muted sm:block">{t.calendar.swipeHint}</p>
          </div>

          <aside className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line px-5 py-5 @3xl:w-96 @3xl:flex-none @3xl:border-t-0 @3xl:border-l">
            <h3 className="text-base font-bold">{selected === today ? `${t.calendar.today} · ${shortDate(selected, lang)}` : longToday(fromIso(selected), lang)}</h3>
            {dayItems.length ? (
              <ul className="mt-3 space-y-2">
                {dayItems.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] text-muted">{t.calendar.dayEmpty}</p>
            )}

            <h3 className="mt-7 text-sm font-bold text-muted">{t.calendar.monthList}</h3>
            {events.length ? (
              <ul className="mt-2 space-y-0.5">
                {events.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(inMonth(e.date, month) ? e.date : `${monthKey(month)}-01`)}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-subtle"
                    >
                      <span className="w-[4.5rem] flex-none text-[13px] text-muted tabular-nums">{shortDate(e.date, lang)}</span>
                      <EventDot event={e} className="size-2.5" />
                      <span className="min-w-0 truncate text-[15px]">{title(e.title)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] text-muted">{t.calendar.monthEmpty}</p>
            )}
          </aside>
        </div>

        {/* 휴대폰 시트는 위와 같은 묶음을 엄지가 닿는 오른쪽 아래에 */}
        <div className="flex flex-none items-center justify-end gap-2 border-t border-line px-5 py-3 sm:hidden">
          {todayButton}
          {prevButton}
          {nextButton}
        </div>
      </div>
    </Modal>
  )
}

/** 넘기는 세 장 중 한 장 — 달마다 따로 불러와서, 옆 달도 미리 받아 둔다 */
function MonthPane({ month, today, selected, onSelect, inert, enabled }: { month: Month; today: string; selected: string; onSelect: (iso: string) => void; inert: boolean; enabled: boolean }) {
  const { data } = useQuery({ ...calendarQueries.month(monthKey(month)), enabled })
  return (
    <div className="h-full w-full flex-none" inert={inert}>
      <MonthGrid month={month} events={data ?? []} today={today} variant="full" selected={selected} onSelect={onSelect} className="h-full" />
    </div>
  )
}

/** 고른 날짜의 일정 한 줄 — 여러 날 일정이면 기간을 함께 */
function EventRow({ event: e }: { event: CalendarEvent }) {
  const { t, f, lang } = useI18n()
  const title = useTitle()
  const period = e.end && e.end !== e.date ? f(t.calendar.period, { start: shortDate(e.date, lang), end: shortDate(e.end, lang) }) : t.calendar.oneDay
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-subtle p-3 ring-1 ring-line">
      <span className="grid size-9 flex-none place-items-center rounded-xl bg-raised ring-1 ring-line">
        <EventDot event={e} className="size-3" />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold">{title(e.title)}</span>
        <span className="mt-0.5 block text-[13px] text-muted">{period}</span>
      </span>
    </li>
  )
}
