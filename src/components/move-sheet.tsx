import { useState } from 'react'
import { useBackCloses } from '@/hooks/use-back-stack'
import { Choice } from '@/components/pain-scale'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import type { DaySession } from '@/data/types'
import { useWeekDots } from '@/hooks/use-data'
import { addDays, daysBetween } from '@/lib/dates'
import { dayLabel, weekdayShort } from '@/lib/format'
import { isHeavy } from '@/lib/session-words'
import { cn } from '@/lib/utils'

// "Plans changed": pick a day (the next 7 as chips, or any date) and morning or evening.
// Lessons move with the trainer; this keeps the plan honest.
export function MoveSheet({
  session,
  today,
  open,
  onOpenChange,
  onMove,
}: {
  session: DaySession
  today: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onMove: (date: string, slot: string) => Promise<boolean>
}) {
  useBackCloses(open, () => onOpenChange(false))
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {open && <MoveForm session={session} today={today} onMove={onMove} onClose={() => onOpenChange(false)} />}
      </DrawerContent>
    </Drawer>
  )
}

function MoveForm({
  session,
  today,
  onMove,
  onClose,
}: {
  session: DaySession
  today: string
  onMove: (date: string, slot: string) => Promise<boolean>
  onClose: () => void
}) {
  const [date, setDate] = useState(session.date)
  const [slot, setSlot] = useState<'am' | 'pm'>(session.slot === 'am' ? 'am' : 'pm')
  const [moving, setMoving] = useState(false)
  const start = today
  const chips = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const changed = date !== session.date || slot !== session.slot

  // Another heavy workout next to the new day? Worth a word: the coach can rebalance the week
  const near = useWeekDots(addDays(date, -1), addDays(date, 1)).data ?? {}
  const otherHeavy =
    isHeavy(session.kind) &&
    Object.entries(near).find(
      ([d, list]) => list.some((s) => isHeavy(s.kind) && s.id !== session.id) && Math.abs(daysBetween(d, date)) <= 1,
    )

  async function move() {
    setMoving(true)
    const ok = await onMove(date, slot)
    setMoving(false)
    if (ok) onClose()
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
      <DrawerHeader className="text-left">
        <DrawerTitle className="text-h2">Sposta “{session.title}”</DrawerTitle>
        <DrawerDescription>Quello che hai già registrato si sposta insieme.</DrawerDescription>
      </DrawerHeader>
      <div className="flex flex-col gap-5 overflow-y-auto px-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Giorno</legend>
          <div className="grid grid-cols-4 gap-2">
            {chips.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                aria-pressed={d === date}
                className={cn(
                  'flex h-14 flex-col items-center justify-center rounded-lg border px-0 text-sm',
                  d === date ? 'bg-foreground text-card' : 'bg-card',
                )}
              >
                <span className="text-xs">{d === today ? 'Oggi' : d === addDays(today, 1) ? 'Domani' : weekdayShort(d)}</span>
                <span className="text-base font-medium tabular-nums">{Number(d.slice(8))}</span>
              </button>
            ))}
            <label
              className={cn(
                'relative flex h-14 flex-col items-center justify-center rounded-lg border text-sm',
                !chips.includes(date) ? 'bg-foreground text-card' : 'bg-card',
              )}
            >
              <span className="text-xs">{!chips.includes(date) ? weekdayShort(date) : 'Altro'}</span>
              <span className="text-[17px] font-bold">{!chips.includes(date) ? Number(date.slice(8)) : '…'}</span>
              <Input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="absolute inset-0 h-full cursor-pointer opacity-0"
                aria-label="Altra data"
              />
            </label>
          </div>
          <span className="text-sm text-muted-foreground">{dayLabel(date)}</span>
        </fieldset>
        <Choice
          label="Momento della giornata"
          options={[
            { value: 'am', label: 'Mattina' },
            { value: 'pm', label: 'Sera' },
          ]}
          value={slot}
          onChange={setSlot}
        />
        {otherHeavy && (
          <p className="banner">
            C’è un altro allenamento impegnativo {dayLabel(otherHeavy[0])}. Se serve, il coach può riequilibrare la settimana.
          </p>
        )}
      </div>
      <DrawerFooter>
        <Button className="h-12 rounded-full text-base" onClick={move} disabled={!changed || moving}>
          {moving ? 'Spostamento…' : changed ? `Sposta a ${dayLabel(date)}` : 'Scegli un altro giorno o momento'}
        </Button>
      </DrawerFooter>
    </div>
  )
}
