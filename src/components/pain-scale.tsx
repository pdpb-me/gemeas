import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PAIN_LEVELS, painLevelFor, type PainBand } from '@/lib/pain'
import { cn } from '@/lib/utils'

// Unselected: neutral outline. Only the chosen word gets its colour. The word is always shown.
const BAND_CLASS: Record<PainBand, string> = {
  low: 'data-[state=on]:bg-pain-low data-[state=on]:text-pain-low-foreground',
  mid: 'data-[state=on]:bg-pain-mid data-[state=on]:text-pain-mid-foreground',
  high: 'data-[state=on]:bg-pain-high data-[state=on]:text-pain-high-foreground',
}

type Level = { score: number; label: string; band: PainBand }

// One question, answered with words (one tap saves). levels / levelFor: the 5 pain words
// by default; other scales can pass their own.
// A tap on the chosen word keeps it (no accidental clearing); `onClear` offers a way back.
export function PainScale({
  label,
  hint,
  value,
  onChange,
  disabled,
  levels = PAIN_LEVELS,
  levelFor = painLevelFor,
  hideLabel = false,
}: {
  label: string
  hint?: string
  value: number | null
  onChange: (score: number) => void
  disabled?: boolean
  levels?: readonly Level[]
  levelFor?: (score: number) => number
  hideLabel?: boolean
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2" disabled={disabled}>
      <legend className={cn('mb-2 text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
        {hint && <span className="font-normal text-muted-foreground"> · {hint}</span>}
      </legend>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={1}
        value={value == null ? '' : String(levelFor(value))}
        onValueChange={(v) => v !== '' && onChange(Number(v))}
        disabled={disabled}
        className="flex w-full"
        aria-label={label}
      >
        {levels.map((l) => (
          <ToggleGroupItem
            key={l.score}
            value={String(l.score)}
            className={cn(
              'h-11 min-w-11 flex-auto px-1.5 text-[13px] text-foreground hover:text-foreground data-[state=on]:border-transparent data-[state=on]:font-semibold',
              BAND_CLASS[l.band],
            )}
          >
            {l.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </fieldset>
  )
}

// A choice that isn't pain (Leggera / Media / Dura, Mattina / Sera, …): the chosen one is dark,
// with a tick, so it can't be missed
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  hideLabel = false,
  className,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
  hideLabel?: boolean
  className?: string
}) {
  return (
    <fieldset className={cn('flex min-w-0 flex-col', className)}>
      <legend className={cn('mb-2 text-sm font-medium', hideLabel && 'sr-only')}>{label}</legend>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        value={value ?? ''}
        onValueChange={(v) => v !== '' && onChange(v as T)}
        className="w-full"
        aria-label={label}
      >
        {options.map((o) => (
          <ToggleGroupItem
            key={o.value}
            value={o.value}
            className="h-11 flex-1 data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background"
          >
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </fieldset>
  )
}
