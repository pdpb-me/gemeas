import { useState } from 'react'
import { FootprintsIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LIMITS } from '@/data/rules'
import { write } from '@/data/store'
import { useDayWalks } from '@/hooks/use-data'
import { useBackCloses } from '@/hooks/use-back-stack'
import { duration, km } from '@/lib/format'

const walkText = (w: { duration_s: number | null; distance_m: number | null }) =>
  [duration(w.duration_s), w.distance_m ? km(w.distance_m) : null].filter(Boolean).join(' · ')

// The day's walks, and a quick way to add one. Removing one offers Undo.
export function DayWalks({ date }: { date: string }) {
  const [open, setOpen] = useState(false)
  const walks = (useDayWalks(date).data ?? []).filter((a) => a.sport === 'walk')

  async function remove(w: (typeof walks)[number]) {
    const ok = await write.removeWalk(w.id)
    if (ok)
      toast('Camminata rimossa', {
        action: {
          label: 'Annulla',
          onClick: () => void write.addWalk(date, (w.duration_s ?? 0) / 60, w.distance_m == null ? null : w.distance_m / 1000),
        },
      })
  }

  return (
    <>
      {walks.length > 0 && (
        <Card className="gap-0 py-1">
          {walks.map((w) => (
            <div key={w.id} className="flex min-h-14 items-center gap-3 border-t pr-1 pl-4 first:border-t-0">
              <FootprintsIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-semibold">Camminata</span>
                <span className="text-sm text-muted-foreground">{walkText(w)}</span>
              </span>
              <Button variant="ghost" size="icon" className="size-11 text-muted-foreground" aria-label="Rimuovi questa camminata" onClick={() => remove(w)}>
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}
        </Card>
      )}
      <Button variant="outline" className="h-11 rounded-full bg-card" onClick={() => setOpen(true)}>
        <PlusIcon />
        Aggiungi camminata
      </Button>
      <WalkSheet date={date} open={open} onOpenChange={setOpen} />
    </>
  )
}

function WalkSheet({ date, open, onOpenChange }: { date: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  useBackCloses(open, () => onOpenChange(false))
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>{open && <WalkForm date={date} onClose={() => onOpenChange(false)} />}</DrawerContent>
    </Drawer>
  )
}

function WalkForm({ date, onClose }: { date: string; onClose: () => void }) {
  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [saving, setSaving] = useState(false)
  const min = Number(minutes.trim())
  const kmText = distance.trim().replace(',', '.')
  const kmValue = kmText === '' ? null : Number(kmText)
  const minOk = minutes.trim() !== '' && LIMITS.minutes(min)
  const kmOk = kmValue == null || LIMITS.km(kmValue)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!minOk || !kmOk) return
    setSaving(true)
    const ok = await write.addWalk(date, min, kmValue)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <form onSubmit={save} className="mx-auto flex min-h-0 w-full max-w-md flex-col">
      <DrawerHeader className="text-left">
        <DrawerTitle className="text-xl">Aggiungi camminata</DrawerTitle>
        <DrawerDescription>Il coach la vede quando prepara il piano.</DrawerDescription>
      </DrawerHeader>
      <div className="grid grid-cols-2 gap-3 px-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="walk-minutes">Minuti</Label>
          <Input
            id="walk-minutes"
            inputMode="numeric"
            placeholder="es. 50"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="h-12 text-xl font-semibold tabular-nums"
          />
          {minutes.trim() !== '' && !minOk && <span className="text-xs font-medium text-destructive">Da 1 a 600 minuti</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="walk-km">
            Km <span className="font-normal text-muted-foreground">· facoltativo</span>
          </Label>
          <Input
            id="walk-km"
            inputMode="decimal"
            placeholder="es. 4,5"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="h-12 text-xl font-semibold tabular-nums"
          />
          {!kmOk && <span className="text-xs font-medium text-destructive">Un numero fino a 100, es. 4,5</span>}
        </div>
      </div>
      <DrawerFooter>
        <Button type="submit" className="h-12 rounded-full text-base" disabled={!minOk || !kmOk || saving}>
          {saving ? 'Salvataggio…' : 'Salva'}
        </Button>
      </DrawerFooter>
    </form>
  )
}
