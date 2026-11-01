import { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { toast } from 'sonner'
import { MorningCheckIn } from '@/components/check-ins'
import { CoachNote } from '@/components/coach-note'
import { Dachshunds } from '@/components/dachshunds'
import { ExerciseScreen } from '@/components/exercise-screen'
import { PlanList } from '@/components/plan-list'
import { SessionScreen, type SessionHandlers } from '@/components/session-screen'
import { CardSkeleton, EmptyNote, ErrorCard } from '@/components/states'
import { DayWalks } from '@/components/walks'
import { WeekStrip } from '@/components/week-strip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { write } from '@/data/store'
import type { DayDot, DaySession } from '@/data/types'
import { useCheckIns } from '@/hooks/use-check-ins'
import { useLastLog, useReview, useWeekDots } from '@/hooks/use-data'
import { useDay } from '@/hooks/use-day'
import { useScreens } from '@/hooks/use-screens'
import { useHour, useToday } from '@/lib/clock'
import { dueCheckIn } from '@/lib/check-ins'
import { addDays, daysBetween, mondayOf, weekOf } from '@/lib/dates'
import { dayMonth, inDays, longDate, plural, weekday } from '@/lib/format'
import { getPref, setPref } from '@/lib/prefs'
import { countsAsDone, sessionPain } from '@/lib/session-status'

type Screen = { kind: 'day' } | { kind: 'session'; id: string; openLog?: boolean } | { kind: 'exercise'; id: string; index: number }

// Opens on today. Three screens: the day (check-in + plan + walks) → a session → an exercise.
// The week strip opens other days (e.g. to fill in yesterday).
export function Today({ tracksFoot, onDeepChange }: { tracksFoot: boolean | undefined; onDeepChange: (deep: boolean) => void }) {
  const today = useToday()
  // the chosen day; null follows today (also when the app is reopened the next morning)
  const [picked, setPicked] = useState<string | null>(null)
  const date = picked ?? today
  // the strip shows the chosen day's week; swiping or the arrows go to the same weekday
  // in the week before or after, so the strip and the page always agree
  const monday = mondayOf(date)
  const days = weekOf(monday)
  // dots for the week before and after too: the strip shows them while it's dragged
  const week = useWeekDots(addDays(monday, -7), addDays(monday, 13))
  const choose = (d: string) => {
    setPicked(d === today ? null : d)
  }

  // key: a fresh day (and screen stack) per date, so the previous day never shows while loading
  return (
    <Day
      key={date}
      date={date}
      today={today}
      days={days}
      dots={week.data ?? {}}
      onDate={choose}
      onWeek={(dir) => choose(addDays(date, dir * 7))}
      tracksFoot={tracksFoot}
      onDeepChange={onDeepChange}
    />
  )
}

function Day({
  date,
  today,
  days,
  dots,
  onDate,
  onWeek,
  tracksFoot,
  onDeepChange,
}: {
  date: string
  today: string
  days: string[]
  dots: Record<string, DayDot[]>
  onDate: (date: string) => void
  onWeek: (direction: -1 | 1) => void
  tracksFoot: boolean | undefined
  onDeepChange: (deep: boolean) => void
}) {
  const day = useDay(date)
  const checkIns = useCheckIns(date)
  const hour = useHour()
  const nav = useScreens<Screen>({ kind: 'day' })
  const isToday = date === today
  const deep = nav.screen.kind !== 'day'
  const ask = dueCheckIn(date, today)

  useEffect(() => {
    onDeepChange(deep)
  }, [deep, onDeepChange])

  // The open session left this day (the coach moved it, or Undo after a move): back to the day
  const openId = 'id' in nav.screen ? nav.screen.id : null
  const gone = openId != null && day.sessions != null && !day.sessions.some((x) => x.id === openId)
  const { back } = nav
  useEffect(() => {
    if (gone) back()
  }, [gone, back])

  const handlers = (id: string): SessionHandlers => {
    const s = () => day.sessions!.find((x) => x.id === id)!
    return {
      onStatus: (status) => day.setStatus(s(), status),
      onEffort: (effort) => day.setEffort(s(), effort),
      onPain: (area, score) => day.setPain(s(), area, score),
      onMinutes: (minutes) => day.setMinutes(s(), minutes),
      onComment: (comment) => day.setComment(s(), comment),
      onTest: (spec, side, value) => day.setTest(s(), spec, side, value),
      onMove: async (newDate, slot) => {
        const before = s()
        const ok = await day.moveSession(before, newDate, slot)
        if (ok)
          toast(`Spostato a ${longDate(newDate)}`, {
            action: newDate !== date ? { label: 'Vai al giorno', onClick: () => onDate(newDate) } : undefined,
            cancel: { label: 'Annulla', onClick: () => void write.moveSession(before.id, before.date, before.slot) },
          })
        return ok
      },
    }
  }

  const current = 'id' in nav.screen ? day.sessions?.find((s) => s.id === (nav.screen as { id: string }).id) : undefined

  if (nav.screen.kind === 'session' && current) {
    return (
      <main className="animate-screen-in mx-auto min-h-svh max-w-md">
        <SessionScreen
          session={current}
          today={today}
          handlers={handlers(current.id)}
          openLog={nav.screen.kind === 'session' && !!nav.screen.openLog}
          onBack={nav.back}
          onOpenExercise={(index) => nav.push({ kind: 'exercise', id: current.id, index })}
        />
      </main>
    )
  }
  if (nav.screen.kind === 'exercise' && current) {
    return (
      <main className="animate-screen-in mx-auto min-h-svh max-w-md bg-card">
        <ExerciseScreen
          session={current}
          index={nav.screen.index}
          onBack={nav.back}
          onIndex={(index) => nav.replace({ kind: 'exercise', id: current.id, index })}
          onFinish={async () => {
            if (!current.log) await day.setStatus(current, 'done')
            nav.back()
          }}
        />
      </main>
    )
  }

  const morning = <MorningCheckIn state={checkIns} ask={ask} isToday={isToday} afternoon={isToday && hour >= 12} tracksFoot={tracksFoot} />
  // the check-in comes first until it's answered or the morning has passed; then the plan does.
  // Without the foot there's only the weight: it stays below the plan.
  const morningFirst = tracksFoot !== false && (!isToday || hour < 12 || checkIns.checkIns?.foot != null)
  // the dogs stay away from a sore foot and the weight
  const calm = (checkIns.checkIns?.foot ?? 0) < 5 && checkIns.checkIns?.weight == null
  const subtitle = isToday ? longDate(date) : `${dayMonth(date)} · ${inDays(date, today)}`

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col">
      <header className="flex flex-col gap-3 border-b bg-card px-3 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 pl-1">
          <div className="flex min-w-0 flex-col">
            <h1 className="text-display font-bold">{isToday ? 'Oggi' : weekday(date)}</h1>
            <p className="text-sm text-muted-foreground">
              {subtitle}
              {!isToday && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="plain -my-3 inline-block py-3 font-bold text-foreground underline underline-offset-4"
                    onClick={() => onDate(today)}
                  >
                    Torna a oggi
                  </button>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Settimana precedente"
              onClick={() => onWeek(-1)}
            >
              <ChevronLeftIcon className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Settimana successiva"
              onClick={() => onWeek(1)}
            >
              <ChevronRightIcon className="size-5" />
            </Button>
          </div>
        </div>
        <WeekStrip days={days} dots={dots} selected={date} today={today} onSelect={onDate} onWeek={onWeek} />
      </header>

      <div className="flex flex-col gap-3 p-4">
        {isToday && <TodayNotes today={today} dots={dots} tracksFoot={tracksFoot} onDate={onDate} />}

        {morningFirst && morning}

        {day.error && !day.sessions ? (
          <ErrorCard what="questa giornata" onRetry={day.retry} />
        ) : day.sessions === undefined ? (
          <CardSkeleton />
        ) : day.sessions.length === 0 ? (
          <NothingPlanned dots={dots} calm={calm} />
        ) : (
          <>
            {isToday && calm && dayDone(day.sessions) && (
              <EmptyNote title="Fatto per oggi" picture={<Dachshunds pose="highfive" />}>
                A domani.
              </EmptyNote>
            )}
            <PlanList
              sessions={day.sessions}
              date={date}
              today={today}
              calm={calm}
              onOpen={(id, openLog) => nav.push({ kind: 'session', id, openLog })}
              onStatus={day.setStatus}
            />
          </>
        )}

        {!morningFirst && morning}
        {date <= today && <DayWalks date={date} />}
        {checkIns.error && !checkIns.checkIns && <ErrorCard what="il check-in" onRetry={checkIns.retry} />}
      </div>
    </main>
  )
}

// Every session is logged, at least one really happened, and none of them hurt
const dayDone = (sessions: DaySession[]) =>
  sessions.every((s) => s.log) &&
  sessions.some((s) => countsAsDone(s.log!.status)) &&
  !sessions.some((s) => (sessionPain(s).score ?? 0) >= 5)

// No sessions on this day: a rest day, or no plan at all yet. The dogs stay away from a sore foot.
function NothingPlanned({ dots, calm }: { dots: Record<string, DayDot[]>; calm: boolean }) {
  const planned = Object.values(dots).some((d) => d.length > 0)
  if (planned)
    return (
      <EmptyNote title="Giorno di riposo" picture={calm && <Dachshunds pose="rest" />}>
        Niente in programma.
      </EmptyNote>
    )
  return (
    <EmptyNote title="Ancora nessun piano" picture={calm && <Dachshunds pose="sit" />}>
      Il coach scrive il piano al check-in settimanale, e poi compare qui.
    </EmptyNote>
  )
}

// At the top of today: the coach's note for this week, and a word about yesterday or a gap
function TodayNotes({
  today,
  dots,
  tracksFoot,
  onDate,
}: {
  today: string
  dots: Record<string, DayDot[]>
  tracksFoot: boolean | undefined
  onDate: (d: string) => void
}) {
  const review = useReview(mondayOf(today)).data
  const lastLog = useLastLog(today).data
  const yesterday = addDays(today, -1)
  const yCheckIns = useCheckIns(yesterday).checkIns
  const [hidden, setHidden] = useState(() => getPref('yesterday-hidden') === yesterday)
  const [welcomed, setWelcomed] = useState(() => getPref('welcome-hidden') === today)

  const thisWeeksNote = review && review.week_start === mondayOf(today) ? review : null
  const away = lastLog && daysBetween(lastLog.date, today) >= 4 ? daysBetween(lastLog.date, today) : 0

  const open = (dots[yesterday] ?? []).filter((d) => !d.status).length
  const missing = [
    open > 0 && (open === 1 ? 'un allenamento' : `${open} allenamenti`),
    tracksFoot && yCheckIns && yCheckIns.foot == null && 'il check-in',
  ].filter((x): x is string => !!x)

  return (
    <>
      {thisWeeksNote && <CoachNote review={thisWeeksNote} />}
      {away ? (
        !welcomed && (
          <EmptyNote
            title="Bentornata"
            action={
              <Button
                variant="ghost"
                className="-mx-2 h-11 px-2 text-primary"
                onClick={() => {
                  setPref('welcome-hidden', today)
                  setWelcomed(true)
                }}
              >
                OK
              </Button>
            }
          >
            {plural(away, 'giorno', 'giorni')} senza l’app. I giorni passati restano come sono: non serve compilarli. Riparti da oggi.
          </EmptyNote>
        )
      ) : (
        lastLog &&
        !hidden &&
        missing.length > 0 && (
          <Card className="gap-1 px-4 pt-3 pb-2">
            <span className="text-sm">
              <span className="font-medium">Ieri:</span>{' '}
              <span className="text-muted-foreground">{missing.join(' e ')} da registrare</span>
            </span>
            <span className="-mr-2 flex justify-end gap-1">
              <Button
                variant="ghost"
                className="h-11 rounded-full px-3 text-muted-foreground"
                onClick={() => {
                  setPref('yesterday-hidden', yesterday)
                  setHidden(true)
                }}
              >
                Lascia così
              </Button>
              <Button variant="outline" className="h-11 rounded-full px-4" onClick={() => onDate(yesterday)}>
                Compila
              </Button>
            </span>
          </Card>
        )
      )}
    </>
  )
}
