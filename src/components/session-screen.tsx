import { useState } from 'react'
import { CalendarArrowUpIcon, InfoIcon, PlayIcon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Dachshunds } from '@/components/dachshunds'
import { ExerciseFigure } from '@/components/exercise-figure'
import { LogSheet } from '@/components/log-sheet'
import { LogSummary } from '@/components/log-summary'
import { MoveSheet } from '@/components/move-sheet'
import { ScreenHeader } from '@/components/screen-header'
import { RowArrow, StatusMark } from '@/components/status-mark'
import { TestCard } from '@/components/test-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { DaySession, Effort, Status, Video } from '@/data/types'
import { exerciseFor } from '@/exercises/catalog'
import { useCheckIns } from '@/hooks/use-check-ins'
import { dogForSport } from '@/lib/dachshunds'
import { asksEffort } from '@/lib/effort'
import { painLabel } from '@/lib/pain'
import { dayLabel, duration, relativeDay } from '@/lib/format'
import type { PainArea } from '@/lib/pain-areas'
import { asksMinutes, sessionMinutes } from '@/lib/session-time'
import { kindWord, SLOT_WORD } from '@/lib/session-words'
import { sessionPain, STATUSES, statusLabel } from '@/lib/session-status'
import { testFor, type Side, type TestSpec } from '@/lib/tests'
import { cn } from '@/lib/utils'

export type SessionHandlers = {
  onStatus: (status: Status | null) => Promise<boolean>
  onEffort: (effort: Effort | null) => void
  onPain: (area: PainArea, score: number | null) => void
  onMinutes: (minutes: number | null) => Promise<boolean>
  onComment: (comment: string) => Promise<boolean>
  onTest: (spec: TestSpec, side: Side, value: number | null) => void
  onMove: (date: string, slot: string) => Promise<boolean>
}

function VideoRow({ video }: { video: Video }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.yt_id}`}
      target="_blank"
      rel="noreferrer"
      className="flex min-h-20 items-center gap-3 border-t py-3 first:border-t-0"
    >
      <span className="relative block h-[54px] w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
        {/* mqdefault is 16:9 with no black bars; hidden if it can't load (offline) */}
        <img
          src={`https://i.ytimg.com/vi/${video.yt_id}/mqdefault.jpg`}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-7 items-center justify-center rounded-sm border-2 bg-card text-foreground">
            <PlayIcon className="ml-0.5 size-3.5 fill-current" />
          </span>
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[17px] font-bold">{video.title}</span>
        <span className="text-sm text-muted-foreground">
          Video{video.duration_s != null && ` · ${duration(video.duration_s)}`} · YouTube
        </span>
        {video.flags && (
          <span className="flex gap-1.5 text-sm">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
            {video.flags}
          </span>
        )}
      </span>
    </a>
  )
}

// One session: what to do (drawings, videos), the result, and the log in the thumb zone.
// Move is at the top right.
export function SessionScreen({
  session,
  today,
  handlers,
  onBack,
  onOpenExercise,
  openLog = false,
}: {
  session: DaySession
  today: string
  handlers: SessionHandlers
  openLog?: boolean
  onBack: () => void
  onOpenExercise: (index: number) => void
}) {
  const [logOpen, setLogOpen] = useState(openLog)
  const todayFoot = useCheckIns(today).checkIns?.foot ?? null
  const [moveOpen, setMoveOpen] = useState(false)
  const exercises = session.exercises.filter((slug) => exerciseFor(slug))
  const test = testFor(session.exercises)
  const { area, score } = sessionPain(session)
  // the twins stay away from a sore foot, and never take the place of the figures
  const pose = !exercises.length && (todayFoot ?? 0) < 5 && (score ?? 0) < 5 ? dogForSport(session.kind) : null
  const minutes = sessionMinutes(session)
  const future = session.date > today
  const hasDetails = !!area || asksEffort(session.kind) || asksMinutes(session.kind)

  async function log(status: Status) {
    const ok = await handlers.onStatus(status)
    if (!ok) return
    if (status !== 'skipped' && hasDetails) setLogOpen(true)
    else {
      toast(`${session.title}: ${statusLabel(status).toLowerCase()}`, {
        action: { label: 'Annulla', onClick: () => void handlers.onStatus(null) },
      })
      onBack()
    }
  }

  return (
    <div className={cn('flex flex-col', future ? 'pb-10' : 'pb-36')}>
      <header className="flex flex-col gap-2 border-b bg-card pb-4">
        <ScreenHeader
          back={relativeDay(session.date, today)}
          onBack={onBack}
          action={
            <Button variant="ghost" className="h-11 px-3 text-base" onClick={() => setMoveOpen(true)}>
              <CalendarArrowUpIcon className="size-5" />
              Sposta
            </Button>
          }
        />
        <div className="flex flex-col gap-1 px-4">
          <span className="text-sm text-muted-foreground">
            {[SLOT_WORD[session.slot] ?? session.slot, kindWord(session.kind), minutes != null && `~${minutes} min`]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <h1 className="text-display font-bold">{session.title}</h1>
          {session.instructions && <p className="text-base leading-relaxed text-muted-foreground">{session.instructions}</p>}
        </div>
      </header>

      <div className="flex flex-col gap-3 p-4">
        {area && !session.log && session.date >= today && todayFoot != null && todayFoot >= 5 && (
          <p className="banner flex gap-2">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              Stamattina il piede era {painLabel(todayFoot)}.{' '}
              {todayFoot >= 7
                ? 'Zona stop: riposalo oggi e avvisa il coach prima di questo allenamento.'
                : 'Vai piano, e fermati se supera Lieve.'}
            </span>
          </p>
        )}

        {pose && (
          <Card className="items-center px-4 py-4">
            <Dachshunds pose={pose} className="w-full max-w-64" />
          </Card>
        )}

        {test && session.log?.status !== 'skipped' && !future && (
          <TestCard
            key={session.id}
            spec={test}
            results={session.tests}
            planSessionId={session.id}
            onChange={async (side, value) => {
              handlers.onTest(test, side, value)
              if (!session.log && value != null) await handlers.onStatus('done') // a result means it was done
            }}
          />
        )}

        {(exercises.length > 0 || session.videos.length > 0) && (
          <Card className="gap-0 px-4 py-1">
            {exercises.map((slug, i) => {
              const ex = exerciseFor(slug)!
              return (
                <button
                  key={`${slug}-${i}`}
                  type="button"
                  onClick={() => onOpenExercise(i)}
                  className="plain flex min-h-21 items-center gap-3 border-t py-3 text-left first:border-t-0"
                >
                  <span className="block h-[68px] w-24 shrink-0 overflow-hidden rounded-lg border bg-muted p-1">
                    <ExerciseFigure slug={slug} contain className="size-full" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[17px] font-bold">{ex.name}</span>
                    {ex.tempo && <span className="text-sm text-muted-foreground">{ex.tempo}</span>}
                  </span>
                  <RowArrow />
                </button>
              )
            })}
            {session.videos.map((v) => (
              <VideoRow key={v.yt_id} video={v} />
            ))}
          </Card>
        )}

        {exercises.length > 0 && (
          <Button variant="outline" className="h-12 rounded-full text-base" onClick={() => onOpenExercise(0)}>
            <PlayIcon className="fill-current" />
            Un esercizio alla volta
          </Button>
        )}
      </div>

      {/* Thumb zone: the log */}
      {future ? (
        <p className="px-6 text-center text-sm text-muted-foreground">In programma per {dayLabel(session.date)}. Lo registri quel giorno.</p>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-md flex-col gap-2 px-4 py-3">
            {session.log ? (
              <button
                type="button"
                onClick={() => setLogOpen(true)}
                className="row min-h-14 justify-start gap-3 px-3 py-2"
                aria-label={`Modifica la registrazione di ${session.title}`}
              >
                <StatusMark status={session.log.status} />
                <span className="min-w-0 flex-1">
                  <LogSummary session={session} />
                </span>
                <span className="text-sm font-bold underline underline-offset-4">Modifica</span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Quanto ne hai fatto?">
                {STATUSES.map((s) => (
                  <Button
                    key={s.value}
                    variant={s.value === 'done' ? 'default' : 'outline'}
                    className="h-12 rounded-full text-[17px] font-bold"
                    onClick={() => log(s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <LogSheet
        open={logOpen}
        onOpenChange={setLogOpen}
        session={session}
        onStatus={handlers.onStatus}
        onEffort={handlers.onEffort}
        onPain={handlers.onPain}
        onMinutes={handlers.onMinutes}
        onComment={handlers.onComment}
        onCleared={() => {
          const was = session.log?.status as Status | undefined
          toast('Registrazione cancellata', was ? { action: { label: 'Annulla', onClick: () => void handlers.onStatus(was) } } : undefined)
        }}
      />

      <MoveSheet
        session={session}
        today={today}
        open={moveOpen}
        onOpenChange={setMoveOpen}
        onMove={async (date, slot) => {
          const ok = await handlers.onMove(date, slot)
          if (ok && date !== session.date) onBack() // it has left this day
          return ok
        }}
      />
    </div>
  )
}
