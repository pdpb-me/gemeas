import { lazy, Suspense, useEffect, useState } from 'react'
import { MessageSquareTextIcon } from 'lucide-react'
import { CoachNoteSheet } from '@/components/coach-note'
import { EmptyNote, ErrorCard } from '@/components/states'
import { RowArrow, StatusMark } from '@/components/status-mark'
import { TestHistory } from '@/components/test-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { data as store } from '@/data/store'
import type { ProgressData } from '@/data/types'
import { useNextTest, useProgress, useReview, useWeekDots } from '@/hooks/use-data'
import { useScreens } from '@/hooks/use-screens'
import { useToday } from '@/lib/clock'
import { addDays, daysBetween, mondayOf, weekOf } from '@/lib/dates'
import { dayLabel, dayMonth, inDays, kg, plural, weekdayLetter, weekdayShort } from '@/lib/format'
import { painBand, painHeight, painLabel } from '@/lib/pain'
import { countsAsDone, PAIN_DOT } from '@/lib/session-status'
import { rightOfLeft, testDays } from '@/lib/tests'
import { footSummary, headline, VERDICT_TEXT, type AreaSummary } from '@/lib/trends'
import { cn } from '@/lib/utils'
import { averageKg } from '@/lib/weight'

// The detail screens and the activities list load when first opened
const PainDetail = lazy(() => import('@/components/pain-detail').then((m) => ({ default: m.PainDetail })))
const WeightDetail = lazy(() => import('@/components/weight-detail').then((m) => ({ default: m.WeightDetail })))
const Activities = lazy(() => import('@/components/activities-list').then((m) => ({ default: m.Activities })))

type Screen = { kind: 'overview' } | { kind: 'pain' } | { kind: 'weight' }

// Overview (cards) | Activities (walks); a card opens its detail.
export function Progress({ tracksFoot, onDeepChange }: { tracksFoot: boolean | undefined; onDeepChange: (deep: boolean) => void }) {
  const today = useToday()
  const progress = useProgress(today)
  const nav = useScreens<Screen>({ kind: 'overview' })
  const [tab, setTab] = useState<'overview' | 'activities'>('overview')
  const deep = nav.screen.kind !== 'overview'
  const data = progress.data

  useEffect(() => {
    onDeepChange(deep)
  }, [deep, onDeepChange])

  if (nav.screen.kind === 'pain' && data)
    return (
      <Suspense>
        <PainDetail data={data} onBack={nav.back} />
      </Suspense>
    )
  if (nav.screen.kind === 'weight' && data)
    return (
      <Suspense>
        <WeightDetail data={data} onBack={nav.back} />
      </Suspense>
    )

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="gap-0">
        <header className="flex flex-col gap-3 border-b bg-card px-4 pt-4 pb-3">
          <h1 className="text-display font-bold">Progressi</h1>
          <TabsList>
            <TabsTrigger value="overview">
              Panoramica
            </TabsTrigger>
            <TabsTrigger value="activities">
              Attività
            </TabsTrigger>
          </TabsList>
        </header>

        <TabsContent value="overview">
          {progress.error && !data ? (
            <div className="p-4">
              <ErrorCard what="i tuoi progressi" onRetry={progress.retry} />
            </div>
          ) : !data || tracksFoot === undefined ? (
            <OverviewSkeleton />
          ) : (
            <Overview data={data} tracksFoot={tracksFoot} onOpen={(s) => nav.push(s)} />
          )}
        </TabsContent>
        <TabsContent value="activities">
          <Suspense fallback={<OverviewSkeleton />}>
            <Activities today={today} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  )
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Caricamento">
      <Skeleton className="h-20 rounded-xl border bg-card" />
      <Skeleton className="h-36 rounded-xl border bg-card" />
      <Skeleton className="h-40 rounded-xl border bg-card" />
      <Skeleton className="h-40 rounded-xl border bg-card" />
    </div>
  )
}

function Overview({ data, tracksFoot, onOpen }: { data: ProgressData; tracksFoot: boolean; onOpen: (s: Screen) => void }) {
  const foot = footSummary(data.symptoms, data.today)
  const anything = data.symptoms.length > 0 || data.weights.length > 0 || data.tests.length > 0
  const l = foot.latest
  const flare = l && l.score >= 5 && daysBetween(l.date, data.today) <= 2 ? `Piede ${painLabel(l.score)} ${weekdayShort(l.date)}.` : undefined

  return (
    <div className="flex flex-col gap-3 p-4">
      {tracksFoot && (
        <div className="feature flex-col justify-start gap-1 text-card">
          <span className="text-sm font-bold">Ultimi 7 giorni</span>
          <p className="text-h2 font-bold text-balance">
            {anything ? headline(foot.verdict, flare) : 'L’andamento compare qui dopo una settimana di check-in.'}
          </p>
        </div>
      )}
      <CoachRow today={data.today} />
      <WeekCard today={data.today} />
      {!tracksFoot && <NothingYet data={data} />}
      {tracksFoot && !anything && (
        <p className="px-1 text-sm text-muted-foreground">Rispondi al check-in del mattino su Oggi. Dopo una settimana, qui vedrai come va il piede.</p>
      )}
      {tracksFoot && anything && <FootCard s={foot} onOpen={() => onOpen({ kind: 'pain' })} />}
      {tracksFoot && <TestCard data={data} />}
      <WeightCard data={data} onOpen={() => onOpen({ kind: 'weight' })} />
      {import.meta.env.MODE !== 'demo' && (
        <Button variant="ghost" className="mt-4 h-11 self-center text-muted-foreground" onClick={() => store.auth.signOut()}>
          Esci
        </Button>
      )}
    </div>
  )
}

// Without the foot, an empty overview has no plan and no weight yet
function NothingYet({ data }: { data: ProgressData }) {
  const days = weekOf(data.today)
  const dots = useWeekDots(days[0], days[6]).data
  if (!dots || Object.keys(dots).length > 0 || data.weights.length > 0) return null
  return (
    <EmptyNote title="Ancora niente da mostrare">
      Qui vedrai la tua settimana, appena hai un piano, e il peso, se lo segni su Oggi.
    </EmptyNote>
  )
}

// A card that opens something: the whole card is the button
function CardButton({
  onClick,
  label,
  children,
  className,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn('row flex-col items-stretch gap-3 px-4 py-4', className)}
    >
      {children}
    </button>
  )
}

function CardTitle({ title, sub, chevron = true }: { title: string; sub?: string; chevron?: boolean }) {
  return (
    <span className="flex items-start justify-between gap-2">
      <span className="flex flex-col">
        <span className="text-[17px] font-bold">{title}</span>
        {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
      </span>
      {chevron && <RowArrow />}
    </span>
  )
}

// The coach's latest note, one row
function CoachRow({ today }: { today: string }) {
  const review = useReview(mondayOf(today)).data
  const [open, setOpen] = useState(false)
  if (!review) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="row min-h-12 justify-start gap-3 px-4"
      >
        <MessageSquareTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="flex-1 text-sm">Nota del coach · settimana del {dayMonth(review.week_start)}</span>
        <RowArrow />
      </button>
      <CoachNoteSheet review={review} open={open} onOpenChange={setOpen} />
    </>
  )
}

// This week: one small mark per planned workout (pills stay out)
function WeekCard({ today }: { today: string }) {
  const days = weekOf(today)
  const dots = useWeekDots(days[0], days[6]).data ?? {}
  const all = Object.values(dots).flat()
  if (all.length === 0) return null
  const done = all.filter((d) => countsAsDone(d.status)).length
  const partial = all.filter((d) => d.status === 'partial').length
  const skipped = all.filter((d) => d.status === 'skipped').length
  return (
    <Card className="gap-3 px-4 py-4">
      <CardTitle title="Questa settimana" sub={`${dayMonth(days[0])} – ${dayMonth(days[6])}`} chevron={false} />
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          {done === 0 && skipped > 0 ? (
            <span className="text-display font-bold">Settimana di riposo</span>
          ) : (
            <span className="flex items-baseline gap-1.5">
              <span className="font-mono text-display font-medium tabular-nums">{done}</span>
              <span className="text-base text-muted-foreground">su {all.length} fatti</span>
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            {[partial > 0 && `${partial} in parte`, skipped > 0 && `${skipped} saltati`].filter(Boolean).join(' · ') || ' '}
          </span>
        </div>
        <div className="flex items-end gap-1.5" aria-hidden>
          {days.map((d) => (
            <div key={d} className="flex flex-col items-center gap-1">
              <div className="flex flex-col-reverse gap-1">
                {(dots[d] ?? []).slice(0, 3).map((s) => (
                  <StatusMark key={s.id} status={s.status} past={d < today} size="sm" />
                ))}
              </div>
              <span className={cn('text-xs', d === today ? 'font-bold' : 'text-muted-foreground')}>{weekdayLetter(d)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// The foot: the word for the last 7 days (colour: the worse of that and the latest),
// the latest answer when it differs, the verdict, and 14 daily bars
function FootCard({ s, onOpen }: { s: AreaSummary; onOpen: () => void }) {
  return (
    <CardButton onClick={onOpen} label="Piede: apri i dettagli">
      <CardTitle title="Piede" sub="Piede destro, primi passi" />
      {s.typical != null ? (
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className={cn('size-3 border-2', PAIN_DOT[painBand(s.typical)])} aria-hidden />
            <span className="text-display font-bold">{painLabel(s.typical)}</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            Media, ultimi 7 giorni
            {s.latest && painLabel(s.latest.score) !== painLabel(s.typical) && (
              <>
                <span aria-hidden>·</span> ultima
                <span className={cn('chip', PAIN_DOT[painBand(s.latest.score)])}>{painLabel(s.latest.score)}</span>({weekdayShort(s.latest.date)})
              </>
            )}
          </span>
          <span className="text-sm font-medium">{VERDICT_TEXT[s.verdict]}</span>
        </span>
      ) : (
        <span className="flex flex-col gap-0.5">
          <span className="text-[17px] font-bold">Ancora poche risposte</span>
          <span className="text-sm text-muted-foreground">{s.answered} risposte negli ultimi 7 giorni. Compare da 3.</span>
        </span>
      )}
      <span className="flex h-12 items-end gap-0.5 border-b-2" aria-hidden>
        {s.series.map((d) => (
          <span
            key={d.date}
            className={cn('flex-1', d.score != null && PAIN_DOT[painBand(d.score)])}
            style={d.score == null ? undefined : { height: `${painHeight(d.score)}%` }}
          />
        ))}
      </span>
      <span className="-mt-2 flex justify-between font-mono text-xs font-normal text-muted-foreground">
        <span>2 settimane fa</span>
        <span>Oggi</span>
      </span>
    </CardButton>
  )
}

// Heel-raise test: the latest result per side, the change since the first, the right as a
// share of the left, and when the next one is. Tap: every test. Only if the coach plans one.
function TestCard({ data }: { data: ProgressData }) {
  const next = useNextTest(data.today)
  const [open, setOpen] = useState(false)
  const days = testDays(data.tests.filter((t) => t.test === 'sl_heel_raise'))
  const first = days[0]
  const last = days[days.length - 1]
  if (!last && !next) return null
  const nextText = next
    ? `Prossimo test ${inDays(next.date, data.today) === 'oggi' ? 'oggi' : `${dayLabel(next.date)} (${inDays(next.date, data.today)})`}`
    : null
  return (
    <>
      <CardButton onClick={() => last && setOpen(true)} label="Test del piede: vedi tutti i test">
        <CardTitle title="Test del piede" sub="Ripetizioni pulite su una gamba" chevron={!!last} />
        {last ? (
          <span className="grid grid-cols-2 gap-3">
            {(['L', 'R'] as const).map((side) => {
              const change = first !== last && first[side] != null && last[side] != null ? last[side]! - first[side]! : null
              return (
                <span key={side} className="flex flex-col">
                  <span className="text-sm text-muted-foreground">{side === 'L' ? 'Sinistra' : 'Destra'}</span>
                  <span className="font-mono text-display font-medium tabular-nums">{last[side] ?? '–'}</span>
                  {change != null && (
                    <span className="text-sm text-muted-foreground">
                      {change > 0 ? `+${change}` : change} dal {dayMonth(first.date)}
                    </span>
                  )}
                </span>
              )
            })}
          </span>
        ) : (
          <span className="text-base text-muted-foreground">Ancora nessun risultato.</span>
        )}
        <span className="text-sm text-muted-foreground">
          {[last && rightOfLeft(last) != null && `Destra al ${rightOfLeft(last)}% della sinistra (${dayMonth(last.date)})`, nextText]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </CardButton>
      <TestHistory days={days} open={open} onOpenChange={setOpen} />
    </>
  )
}

// Weight: the 7-day average and a small 4-week line. Numbers only: no goal, no comment.
function WeightCard({ data, onOpen }: { data: ProgressData; onOpen: () => void }) {
  const last = data.weights[data.weights.length - 1]
  if (!last) return null
  const now = averageKg(data.weights, addDays(data.today, -6), data.today)
  const recent = data.weights.filter((w) => w.date > addDays(data.today, -28))
  const lo = Math.min(...recent.map((w) => w.kg))
  const hi = Math.max(...recent.map((w) => w.kg))
  const span = Math.max(hi - lo, 2) // small changes stay small: water and food move it ±0.5 kg
  const dayX = (d: string) => (daysBetween(addDays(data.today, -27), d) / 27) * 100
  return (
    <CardButton onClick={onOpen} label="Peso: apri i dettagli">
      <CardTitle title="Peso" sub={`Ultimo valore ${dayMonth(last.date)}`} />
      <span className="flex items-end justify-between gap-3">
        <span className="flex flex-col">
          <span className="font-mono text-display font-medium tabular-nums">{kg(now?.kg ?? last.kg)}</span>
          <span className="text-sm text-muted-foreground">{now ? 'Media, ultimi 7 giorni' : 'Ultimo valore'}</span>
        </span>
        {recent.length >= 2 && (
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-24 shrink-0" aria-hidden>
            <polyline
              points={recent.map((w) => `${dayX(w.date).toFixed(1)},${(36 - ((w.kg - lo) / span) * 32).toFixed(1)}`).join(' ')}
              fill="none"
              className="stroke-foreground"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </span>
      <span className="sr-only">{plural(recent.length, 'valore', 'valori')} in 4 settimane</span>
    </CardButton>
  )
}
