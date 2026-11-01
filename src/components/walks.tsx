import { FootprintsIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { write } from '@/data/store'
import { useDayWalks } from '@/hooks/use-data'
import { duration, km } from '@/lib/format'

const walkText = (w: { duration_s: number | null; distance_m: number | null }) =>
  [duration(w.duration_s), w.distance_m ? km(w.distance_m) : null].filter(Boolean).join(' · ')

// The day's walks. Removing one offers Undo.
// A walk from the watch stays: the next sync would only bring it back.
export function DayWalks({ date }: { date: string }) {
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

  if (walks.length === 0) return null
  return (
    <Card className="gap-0 py-1">
      {walks.map((w) => (
        <div key={w.id} className="flex min-h-14 items-center gap-3 border-t pr-1 pl-4 first:border-t-0">
          <FootprintsIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[17px] font-bold">Camminata</span>
            <span className="text-sm text-muted-foreground">
              {walkText(w)}
              {w.source === 'garmin' && ' · dall’orologio'}
            </span>
          </span>
          {w.source !== 'garmin' && (
            <Button variant="ghost" size="icon" className="size-11 text-muted-foreground" aria-label="Rimuovi questa camminata" onClick={() => remove(w)}>
              <Trash2Icon className="size-4" />
            </Button>
          )}
        </div>
      ))}
    </Card>
  )
}
