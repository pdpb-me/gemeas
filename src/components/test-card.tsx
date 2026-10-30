import { useEffect, useRef, useState } from 'react'
import { useBackCloses } from '@/hooks/use-back-stack'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TestResult } from '@/data/types'
import { useTestResults } from '@/hooks/use-data'
import { dayMonth } from '@/lib/format'
import { rightOfLeft, SIDES, testDays, type Side, type TestDay, type TestSpec } from '@/lib/tests'

// The heel-raise test on its own session screen: Left / Right boxes, with last time's
// numbers beside them. A box saves when it loses focus (or with Enter); empty clears it.
export function TestCard({
  spec,
  results,
  planSessionId,
  onChange,
}: {
  spec: TestSpec
  results: TestResult[]
  planSessionId: string
  onChange: (side: Side, value: number | null) => void
}) {
  const history = testDays((useTestResults(spec.test).data ?? []).filter((r) => r.plan_session_id !== planSessionId))
  const last = history[history.length - 1]
  const saved = (side: Side) => {
    const r = results.find((t) => t.test === spec.test && t.side === side)
    return r ? String(r.value) : ''
  }
  const [draft, setDraft] = useState<Record<Side, string>>({ L: saved('L'), R: saved('R') })
  const [historyOpen, setHistoryOpen] = useState(false)
  const [invalid, setInvalid] = useState<Record<Side, boolean>>({ L: false, R: false })

  function commit(side: Side) {
    const text = draft[side].trim()
    if (text === saved(side)) return setInvalid((v) => ({ ...v, [side]: false }))
    const value = text === '' ? null : Number(text)
    const ok = value == null || (Number.isInteger(value) && value >= 0 && value <= 200)
    setInvalid((v) => ({ ...v, [side]: !ok }))
    if (ok) onChange(side, value)
  }

  // A box still being typed in when the screen closes (back gesture with the keyboard up) saves too
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })
  useEffect(
    () => () => {
      commitRef.current('L')
      commitRef.current('R')
    },
    [],
  )

  return (
    <Card className="gap-4 px-4 py-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold">Il tuo risultato</h2>
        <p className="text-sm text-muted-foreground">Ripetizioni pulite su una gamba, prima la sinistra. Fermati se il piede supera Lieve.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SIDES.map(({ side, label }) => (
          <div key={side} className="flex flex-col gap-1.5">
            <Label htmlFor={`test-${side}`} className="text-sm">
              {label}
            </Label>
            <Input
              id={`test-${side}`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={spec.unit}
              value={draft[side]}
              onChange={(e) => setDraft((d) => ({ ...d, [side]: e.target.value }))}
              onBlur={() => commit(side)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="h-12 text-xl font-semibold tabular-nums"
            />
            {invalid[side] && <span className="text-xs font-medium text-destructive">Non salvato: un numero intero, da 0 a 200</span>}
            <span className="text-xs text-muted-foreground">
              {last?.[side] != null ? `Ultima volta: ${last[side]} (${dayMonth(last.date)})` : 'Prima volta'}
            </span>
          </div>
        ))}
      </div>
      {history.length > 0 && (
        <Button variant="ghost" className="-mx-2 h-11 self-start px-2 text-primary" onClick={() => setHistoryOpen(true)}>
          Vedi tutti i test
        </Button>
      )}
      <TestHistory days={history} open={historyOpen} onOpenChange={setHistoryOpen} />
    </Card>
  )
}

// Every test so far, newest first: left, right, and the right as a share of the left
export function TestHistory({ days, open, onOpenChange }: { days: TestDay[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const max = Math.max(1, ...days.flatMap((d) => [d.L ?? 0, d.R ?? 0]))
  useBackCloses(open, () => onOpenChange(false))
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-xl">Test di sollevamento tallone</DrawerTitle>
            <DrawerDescription>Ripetizioni pulite su una gamba. 100% vuol dire che i due lati sono uguali.</DrawerDescription>
          </DrawerHeader>
          <ol className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4">
            {[...days].reverse().map((d) => (
              <li key={d.date} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{dayMonth(d.date)}</span>
                  {rightOfLeft(d) != null && <span className="text-sm text-muted-foreground">Destra al {rightOfLeft(d)}% della sinistra</span>}
                </div>
                {(['L', 'R'] as const).map((side) => (
                  <div key={side} className="flex items-center gap-2 text-sm">
                    <span className="w-14 text-muted-foreground">{side === 'L' ? 'Sinistra' : 'Destra'}</span>
                    <span className="h-2 flex-1 rounded-full bg-muted">
                      <span className="block h-2 rounded-full bg-foreground/70" style={{ width: `${((d[side] ?? 0) / max) * 100}%` }} />
                    </span>
                    <span className="w-8 text-right font-semibold tabular-nums">{d[side] ?? '–'}</span>
                  </div>
                ))}
              </li>
            ))}
          </ol>
          <DrawerFooter>
            <Button variant="outline" className="h-11 rounded-full" onClick={() => onOpenChange(false)}>
              Chiudi
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
