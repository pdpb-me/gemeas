import { useLayoutEffect, useRef } from 'react'
import { StatusDot } from '@/components/status-mark'
import type { DayDot } from '@/data/types'
import { addDays, weekOf } from '@/lib/dates'
import { longDate, weekdayLetter } from '@/lib/format'
import { statusLabel } from '@/lib/session-status'
import { cn } from '@/lib/utils'

// Chrome 114+ tells when a scroll has settled; older browsers get a short pause instead
const HAS_SCROLLEND = typeof window !== 'undefined' && 'onscrollend' in window

// Mon–Sun as day buttons, one dot per planned session (done, partly, skipped, not logged).
// The chosen day is dark; today keeps a ring when another day is chosen.
// The strip holds three weeks (before, shown, after) in a sideways scroller that snaps to
// whole weeks: the days follow the finger, and when it settles on a neighbour week that
// week becomes the shown one and the scroller jumps back to the middle, unseen.
export function WeekStrip({
  days,
  dots,
  selected,
  today,
  onSelect,
  onWeek,
}: {
  days: string[]
  dots: Record<string, DayDot[]> // for all three weeks
  selected: string
  today: string
  onSelect: (date: string) => void
  onWeek: (direction: -1 | 1) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const first = days[0]
  const weeks = [weekOf(addDays(first, -7)), days, weekOf(addDays(first, 7))]

  // the shown week sits in the middle
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.clientWidth
  }, [first])

  const settle = () => {
    const el = scroller.current
    if (!el || el.clientWidth === 0) return
    const panel = Math.round(el.scrollLeft / el.clientWidth)
    if (panel === 0) onWeek(-1)
    if (panel === 2) onWeek(1)
  }

  const pause = useRef<number | undefined>(undefined)
  const onScroll = () => {
    if (HAS_SCROLLEND) return
    window.clearTimeout(pause.current)
    pause.current = window.setTimeout(settle, 150)
  }

  return (
    <div
      ref={scroller}
      onScroll={onScroll}
      onScrollEnd={settle}
      className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {weeks.map((week, w) => (
        <div key={week[0]} aria-hidden={w !== 1 || undefined} className="grid w-full shrink-0 snap-center snap-always grid-cols-7 gap-1">
          {week.map((iso) => {
            const sessions = dots[iso] ?? []
            const on = iso === selected
            const past = iso < today
            const summary = sessions.length
              ? sessions
                  .map(
                    (s) =>
                      `${s.slot === 'am' ? 'mattina' : 'sera'} ${s.status ? statusLabel(s.status).toLowerCase() : past ? 'da registrare' : 'da fare'}`,
                  )
                  .join(', ')
              : 'niente in programma'
            return (
              <button
                key={iso}
                type="button"
                tabIndex={w === 1 ? undefined : -1}
                onClick={() => onSelect(iso)}
                aria-current={on ? 'date' : undefined}
                aria-label={`${longDate(iso)}${iso === today ? ' (oggi)' : ''}: ${summary}`}
                className={cn(
                  'plain flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl',
                  on && 'bg-foreground text-card',
                  !on && iso === today && 'border',
                )}
              >
                <span className={cn('text-xs font-bold', !on && 'text-muted-foreground')}>{weekdayLetter(iso)}</span>
                <span className="text-base leading-none font-medium tabular-nums">
                  {Number(iso.slice(8))}
                </span>
                <span className="mt-1 flex h-2 gap-0.5">
                  {sessions.slice(0, 4).map((s) => (
                    <StatusDot key={s.id} status={s.status} past={past} inverted={on} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
