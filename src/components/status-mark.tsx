import { CheckIcon, MinusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// The round mark at the start of a session row. Done: filled with a tick. Partly: half
// filled. Skipped: grey with a dash. Not logged on a past day: dashed ring. Planned: ring.
export function StatusMark({
  status,
  past = false,
  size = 'md',
}: {
  status: string | null | undefined
  past?: boolean
  size?: 'sm' | 'md'
}) {
  const box = cn('flex shrink-0 items-center justify-center rounded-full', size === 'md' ? 'size-8' : 'size-5')
  const icon = size === 'md' ? 'size-4' : 'size-3'
  if (status === 'done')
    return (
      <span className={cn(box, 'animate-pop bg-status-done text-primary-foreground')} aria-label="Fatto">
        <CheckIcon className={icon} strokeWidth={3} />
      </span>
    )
  if (status === 'partial') return <span className={cn(box, 'animate-pop status-half')} aria-label="Fatto in parte" />
  if (status === 'skipped')
    return (
      <span className={cn(box, 'animate-pop bg-muted text-status-skipped ring-1 ring-foreground/10')} aria-label="Saltato">
        <MinusIcon className={icon} strokeWidth={3} />
      </span>
    )
  return (
    <span
      className={cn(box, past ? 'border-2 border-dashed border-foreground/25' : 'ring-2 ring-foreground/15 ring-inset')}
      aria-label={past ? 'Da registrare' : 'Ancora da registrare'}
    />
  )
}

// The same, tiny, for the week strip and week cards
export function StatusDot({ status, past = false, inverted = false }: { status: string | null; past?: boolean; inverted?: boolean }) {
  return (
    <span
      className={cn(
        'size-1.5 rounded-full',
        status === 'done' && (inverted ? 'bg-background' : 'bg-status-done'),
        status === 'partial' && (inverted ? 'bg-background/60' : 'status-half'),
        status === 'skipped' && (inverted ? 'bg-background/35' : 'bg-status-skipped'),
        !status && (inverted ? 'ring-1 ring-background/50 ring-inset' : past ? 'ring-1 ring-foreground/35 ring-inset' : 'bg-foreground/15'),
      )}
    />
  )
}
