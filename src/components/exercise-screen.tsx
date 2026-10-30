import { CheckIcon, OctagonAlertIcon, XIcon } from 'lucide-react'
import { ExerciseFigure } from '@/components/exercise-figure'
import { ScreenHeader } from '@/components/screen-header'
import { Button } from '@/components/ui/button'
import type { DaySession } from '@/data/types'
import { exerciseFor } from '@/exercises/catalog'

function Label({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm text-muted-foreground">{children}</h2>
}

// One exercise, full screen: the figure large, then today's plan, tempo, cues, don'ts, setup.
// "Today's plan" is the session's own instructions (the plan can change); the catalog dose
// is the fallback. The last exercise ends with "Finish and log".
export function ExerciseScreen({
  session,
  index,
  onBack,
  onIndex,
  onFinish,
}: {
  session: DaySession
  index: number
  onBack: () => void
  onIndex: (index: number) => void
  onFinish: () => void
}) {
  const slugs = session.exercises.filter((slug) => exerciseFor(slug))
  const ex = exerciseFor(slugs[index] ?? '')
  if (!ex) return null
  const plan = session.instructions?.trim() || ex.dose
  const last = index >= slugs.length - 1

  return (
    <div className="flex flex-col bg-card pb-28">
      <ScreenHeader
        back={session.title}
        onBack={onBack}
        action={
          <span className="pr-3 text-sm text-muted-foreground tabular-nums">
            {index + 1} di {slugs.length}
          </span>
        }
      />

      <div className="flex flex-col gap-5 px-4 pt-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-display font-bold">{ex.name}</h1>
          {ex.tempo && <p className="text-base text-muted-foreground">Ritmo {ex.tempo}</p>}
        </div>

        <ExerciseFigure slug={ex.slug} inset className="rounded-xl bg-muted p-3" />

        <section className="flex flex-col gap-1">
          <Label>Piano di oggi</Label>
          <p className="text-base leading-relaxed">{plan}</p>
        </section>

        <section className="flex flex-col gap-2 border-t pt-4">
          <Label>Cosa fare</Label>
          {ex.cues.map((c) => (
            <div key={c} className="flex items-start gap-2.5">
              <CheckIcon className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2.6} aria-hidden />
              <span className="text-lg font-medium">{c}</span>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <Label>Da evitare</Label>
          {ex.donts.map((d) => (
            <div key={d} className="flex items-start gap-2.5">
              <XIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={2.6} aria-hidden />
              <span className="text-base">{d}</span>
            </div>
          ))}
        </section>

        {ex.stop && (
          <section className="flex gap-2.5 rounded-lg bg-muted px-3 py-3">
            <OctagonAlertIcon className="mt-0.5 size-5 shrink-0 text-pain-high" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">Fermati se</span>
              <p className="text-base leading-relaxed">{ex.stop}</p>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-1.5 border-t pt-4">
          <Label>Posizione</Label>
          <p className="leading-relaxed">{ex.setup}</p>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md gap-2.5 px-4 py-3">
          {last ? (
            <>
              <Button variant="outline" className="h-12 flex-1 rounded-full text-base" onClick={onBack}>
                Chiudi
              </Button>
              <Button className="h-12 flex-1 rounded-full text-base font-semibold" onClick={onFinish}>
                {session.log ? 'Fine' : 'Fine e registra'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="h-12 flex-1 rounded-full text-base" onClick={onBack}>
                Chiudi
              </Button>
              <Button className="h-12 flex-1 rounded-full text-base font-semibold" onClick={() => onIndex(index + 1)}>
                Prossimo esercizio
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
