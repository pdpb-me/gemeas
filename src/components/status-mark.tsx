import { CheckIcon, MinusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// The arrow at the end of a row that opens something
export function RowArrow() {
  return (
    <span className="w-3 shrink-0 font-mono text-base font-bold" aria-hidden>
      ▸
    </span>
  )
}

// The square mark at the start of a session row, by shape and in ink only: a session isn't
// "good" or "poor". Done: filled with a tick. Partly: half filled. Skipped: a dash.
// Not logged on a past day: dashed outline. Planned: outline.
export function StatusMark({
  status,
  past = false,
  size = 'md',
}: {
  status: string | null | undefined
  past?: boolean
  size?: 'sm' | 'md'
}) {
  const box = cn('flex shrink-0 items-center justify-center rounded-sm border-2', size === 'md' ? 'size-8' : 'size-5')
  const icon = size === 'md' ? 'size-4' : 'size-3'
  if (status === 'done')
    return (
      <span className={cn(box, 'animate-pop bg-foreground text-card')} aria-label="Fatto">
        <CheckIcon className={icon} strokeWidth={3} />
      </span>
    )
  if (status === 'partial') return <span className={cn(box, 'animate-pop status-half')} aria-label="Fatto in parte" />
  if (status === 'skipped')
    return (
      <span className={cn(box, 'animate-pop')} aria-label="Saltato">
        <MinusIcon className={icon} strokeWidth={3} />
      </span>
    )
  return <span className={cn(box, past && 'border-dashed')} aria-label={past ? 'Da registrare' : 'Ancora da registrare'} />
}

// The same, tiny, for the week strip and week cards
export function StatusDot({ status, past = false, inverted = false }: { status: string | null; past?: boolean; inverted?: boolean }) {
  const ink = inverted ? 'border-card' : 'border-foreground'
  return (
    <span
      className={cn(
        'size-2',
        status === 'done' && (inverted ? 'bg-card' : 'bg-foreground'),
        status === 'partial' && cn('border', ink, inverted ? 'bg-[linear-gradient(90deg,var(--card)_50%,transparent_50%)]' : 'status-half'),
        status === 'skipped' && cn('h-0 self-center border-t-2', ink),
        !status && cn('border', ink, past && 'border-dashed'),
      )}
    />
  )
}
