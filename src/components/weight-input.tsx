import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { decimal } from '@/lib/format'

// Optional morning weight (kg). Saves when the box loses focus; empty removes the day's value.
// Accepts "62,4" or "62.4".
export function WeightInput({ value, onSave }: { value: number | null; onSave: (kg: number | null) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value != null ? decimal(value) : '')

  const [invalid, setInvalid] = useState(false)

  function commit() {
    const text = draft.trim().replace(',', '.')
    setInvalid(false)
    if (text === (value != null ? value.toFixed(1) : '')) return
    if (text === '') return void onSave(null)
    const kg = Number(text)
    if (!Number.isFinite(kg) || kg < 30 || kg > 250) return setInvalid(true)
    onSave(Math.round(kg * 10) / 10)
  }

  // Still being typed in when the card goes away: save it too
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })
  useEffect(() => () => commitRef.current(), [])

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="morning-weight" className="text-sm font-medium">
        Peso <span className="font-medium text-muted-foreground">· facoltativo</span>
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="morning-weight"
          inputMode="decimal"
          placeholder="es. 62,4"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="h-11 max-w-32 text-base tabular-nums"
        />
        <span className="text-muted-foreground">kg</span>
      </div>
      {invalid && <span className="text-xs font-medium text-destructive">Non salvato: kg tra 30 e 250, es. 62,4</span>}
      <span className="text-xs text-muted-foreground">Dopo il bagno, prima di bere o mangiare. Qualche volta a settimana basta.</span>
    </div>
  )
}
