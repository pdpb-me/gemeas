import type { DaySession } from '@/data/types'
import { asksEffort, effortLabel } from '@/lib/effort'
import { painBand, painLabel } from '@/lib/pain'
import { PAIN_DOT, sessionPain, statusLabel } from '@/lib/session-status'
import { SIDES, testFor } from '@/lib/tests'
import { cn } from '@/lib/utils'

const dot = '·'

// What was logged, in one short line: "Piede ● Lieve · S 22 · D 15 rip." or "Media".
// compact (in the day's plan): the status shows in the round mark, so the word is left out,
// and a missing answer gets a gentle "add" hint.
export function LogSummary({ session, compact = false }: { session: DaySession; compact?: boolean }) {
  const log = session.log!
  const { area, score } = sessionPain(session)
  const spec = testFor(session.exercises)
  const sides = spec
    ? SIDES.flatMap(({ side, short }) => {
        const r = session.tests.find((t) => t.test === spec.test && t.side === side)
        return r ? [`${short} ${r.value}`] : []
      })
    : []
  const happened = log.status !== 'skipped'
  const parts: React.ReactNode[] = []
  if (!compact)
    parts.push(
      <span key="s" className="font-semibold text-foreground">
        {statusLabel(log.status)}
      </span>,
    )
  if (log.effort)
    parts.push(
      <span key="e" className="whitespace-nowrap text-foreground">
        {effortLabel(log.effort)}
      </span>,
    )
  if (area && score != null)
    parts.push(
      <span key="p" className="inline-flex items-center gap-1.5 whitespace-nowrap">
        {area.short}
        <span className={cn('size-2 rounded-full', PAIN_DOT[painBand(score)])} aria-hidden />
        <span className="text-foreground">{painLabel(score)}</span>
      </span>,
    )
  if (spec && sides.length)
    parts.push(<span key="t" className="whitespace-nowrap text-foreground">{`${sides.join(' · ')} ${spec.unit}`}</span>)

  const needsPain = compact && happened && area && score == null
  const needsEffort = compact && happened && asksEffort(session.kind) && !log.effort
  const hint = needsPain ? `Aggiungi dolore al ${area!.short.toLowerCase()}` : needsEffort ? 'Quanto è stata dura?' : null
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {(parts.length > 0 || hint) && (
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
          {parts.flatMap((p, i) =>
            i
              ? [
                  <span key={`d${i}`} aria-hidden>
                    {dot}
                  </span>,
                  p,
                ]
              : [p],
          )}
          {hint && (
            <>
              {parts.length > 0 && <span aria-hidden>{dot}</span>}
              <span className="text-primary">{hint}</span>
            </>
          )}
        </span>
      )}
      {log.comment && <span className="line-clamp-1 text-sm text-muted-foreground italic">“{log.comment}”</span>}
      {compact && !parts.length && !hint && !log.comment && <span className="text-sm text-muted-foreground">{statusLabel(log.status)}</span>}
    </span>
  )
}
