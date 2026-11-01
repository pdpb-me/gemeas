import { useState } from 'react'
import { InfoIcon, SunriseIcon } from 'lucide-react'
import { PainScale } from '@/components/pain-scale'
import { WeightInput } from '@/components/weight-input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { useCheckIns } from '@/hooks/use-check-ins'
import type { Ask } from '@/lib/check-ins'
import { kg } from '@/lib/format'
import { painBand, painLabel } from '@/lib/pain'
import { PAIN_DOT } from '@/lib/session-status'
import { cn } from '@/lib/utils'

type CheckInsState = ReturnType<typeof useCheckIns>

// A calm word after a hard answer: what it means for today, never alarming
function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="banner flex gap-2">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

// Who doesn't follow the foot: only the weight, if she likes. It never asks.
function WeightOnly({ state, isToday }: { state: CheckInsState; isToday: boolean }) {
  const [open, setOpen] = useState(false)
  const weight = state.checkIns?.weight ?? null
  if (open)
    return (
      <Card className="gap-3 px-4 py-4">
        <WeightInput key={weight ?? 'none'} value={weight} onSave={state.saveWeight} />
        <Button variant="outline" className="h-11 rounded-full" onClick={() => setOpen(false)}>
          Fatto
        </Button>
      </Card>
    )
  if (weight == null)
    return (
      <Button variant="ghost" className="h-11 self-start px-2 text-primary" onClick={() => setOpen(true)}>
        Aggiungi peso
      </Button>
    )
  return (
    <Card className="flex-row items-center gap-3 py-2 pr-2 pl-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-bold text-muted-foreground">{isToday ? 'Stamattina' : 'Quella mattina'}</span>
        <span className="mt-0.5 text-sm font-bold tabular-nums">{kg(weight)}</span>
      </div>
      <Button variant="ghost" className="h-11 rounded-full px-4 text-primary" onClick={() => setOpen(true)}>
        Modifica
      </Button>
    </Card>
  )
}

// Morning: the right foot at the first steps out of bed, and the weight if she likes.
export function MorningCheckIn({
  state,
  ask,
  isToday,
  afternoon = false,
  tracksFoot,
}: {
  state: CheckInsState
  ask: Ask
  isToday: boolean
  afternoon?: boolean
  tracksFoot: boolean | undefined
}) {
  const [open, setOpen] = useState(false) // opened by hand (Edit, or to add the weight)
  const [weightOpen, setWeightOpen] = useState(false)
  const c = state.checkIns
  if (ask === 'none') return null
  if (!c || tracksFoot === undefined) return <Skeleton className="h-36 rounded-xl bg-card" />
  if (!tracksFoot) return <WeightOnly state={state} isToday={isToday} />

  const sore = isToday && c.foot != null && c.foot >= 5
  const note = sore && (
    <Note>
      {c.foot! >= 7
        ? `Piede ${painLabel(c.foot!)} oggi: è la zona stop. Riposalo oggi (niente esercizi per il piede) e avvisa il coach.`
        : 'Piede un po’ dolorante oggi. Vai piano, e fermati se un esercizio supera Lieve.'}
    </Note>
  )

  if (c.foot != null && !open)
    return (
      <div className="flex flex-col gap-2">
        <Card className="animate-fade-in flex-row items-center gap-3 py-2 pr-2 pl-4">
          <SunriseIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs font-bold text-muted-foreground">{isToday ? 'Stamattina' : 'Quella mattina'}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-muted-foreground">Piede</span>
                <span className={cn('chip', PAIN_DOT[painBand(c.foot)])}>{painLabel(c.foot)}</span>
              </span>
              {c.weight != null && <span className="font-bold tabular-nums">{kg(c.weight)}</span>}
            </span>
          </div>
          <Button variant="ghost" className="h-11 rounded-full px-4 text-primary" onClick={() => setOpen(true)}>
            Modifica
          </Button>
        </Card>
        {note}
      </div>
    )

  return (
    <Card className="animate-fade-in gap-3 rounded-2xl px-4 py-4 shadow-[var(--shadow-m)]">
      <div className="flex flex-col gap-0.5">
        <h2>
          {isToday ? (afternoon ? 'Com’era il piede stamattina?' : 'Come va il piede stamattina?') : 'Com’era il piede quella mattina?'}
        </h2>
        <p className="text-sm text-muted-foreground">Piede destro, primi passi appena alzata</p>
      </div>
      <PainScale label="Piede destro, primi passi" hideLabel value={c.foot} onChange={(s) => state.save(s)} />
      {note}
      {weightOpen || c.weight != null ? (
        <WeightInput key={c.weight ?? 'none'} value={c.weight} onSave={state.saveWeight} />
      ) : (
        <Button variant="ghost" className="-mx-2 h-11 self-start px-2 text-primary" onClick={() => setWeightOpen(true)}>
          Aggiungi peso
        </Button>
      )}
      {open && (
        <Button
          variant="outline"
          className="h-11 rounded-full"
          onClick={() => {
            setOpen(false)
            setWeightOpen(false)
          }}
        >
          Fatto
        </Button>
      )}
    </Card>
  )
}
