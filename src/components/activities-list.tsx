import { useState } from 'react'
import { ActivityIcon, ChevronLeftIcon, ChevronRightIcon, FootprintsIcon, type LucideIcon } from 'lucide-react'
import { CardSkeleton, ErrorCard } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ActivityRow } from '@/data/types'
import { useActivitiesMonth } from '@/hooks/use-activities-month'
import { mondayOf, shiftMonth } from '@/lib/dates'
import { capitalize, dayLabel, dayMonth, duration, km, monthName, plural } from '@/lib/format'

const SPORT: Record<string, { label: string; icon: LucideIcon }> = {
  walk: { label: 'Camminata', icon: FootprintsIcon },
}
const sportOf = (s: string) => SPORT[s] ?? { label: capitalize(s), icon: ActivityIcon }

// Activities tab: one month at a time (‹ Novembre 2026 ›), its weeks newest first, by day
export function Activities({ today }: { today: string }) {
  const thisMonth = mondayOf(today).slice(0, 7) // the month this week belongs to
  const [month, setMonth] = useState(thisMonth)
  const { items, error, retry, oldestMonth } = useActivitiesMonth(month)
  const total = (items ?? []).reduce((t, a) => t + (a.duration_s ?? 0), 0)

  return (
    <div className="flex flex-col">
      <nav className="flex items-center justify-between px-2 pt-3" aria-label="Mese">
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Mese precedente"
          disabled={oldestMonth == null || month <= oldestMonth}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeftIcon className="size-5" />
        </Button>
        <span className="flex flex-col items-center">
          <span className="text-[17px] font-bold">{monthName(month)}</span>
          <span className="text-xs text-muted-foreground">
            {items === undefined ? ' ' : `${plural(items.length, 'attività', 'attività')} · ${duration(total)}`}
          </span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Mese successivo"
          disabled={month >= thisMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRightIcon className="size-5" />
        </Button>
      </nav>
      {month !== thisMonth && (
        <Button variant="ghost" className="mx-auto h-11 text-primary" onClick={() => setMonth(thisMonth)}>
          Torna a questo mese
        </Button>
      )}
      {error && !items ? (
        <div className="p-4">
          <ErrorCard what="le attività" onRetry={retry} />
        </div>
      ) : items === undefined ? (
        <div className="p-4">
          <CardSkeleton rows={4} />
        </div>
      ) : (
        <ActivitiesList items={items} today={today} empty={`Nessuna attività in ${monthName(month).toLowerCase()}. Le camminate si aggiungono da Oggi.`} />
      )}
    </div>
  )
}

// Activities by week and day, newest first
export function ActivitiesList({ items, today, empty }: { items: ActivityRow[]; today: string; empty: string }) {
  if (items.length === 0) return <p className="p-8 text-center text-muted-foreground">{empty}</p>
  const thisMonday = mondayOf(today)
  const weeks = new Map<string, Map<string, ActivityRow[]>>()
  for (const a of items) {
    const days = weeks.get(mondayOf(a.date)) ?? new Map<string, ActivityRow[]>()
    days.set(a.date, [...(days.get(a.date) ?? []), a])
    weeks.set(mondayOf(a.date), days)
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      {[...weeks.entries()].map(([monday, days]) => {
        const list = [...days.values()].flat()
        const time = list.reduce((t, a) => t + (a.duration_s ?? 0), 0)
        const metres = list.reduce((t, a) => t + (a.distance_m ?? 0), 0)
        return (
          <section key={monday} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-1">
              <h2>{monday === thisMonday ? 'Questa settimana' : `Settimana del ${dayMonth(monday)}`}</h2>
              <span className="text-sm text-muted-foreground">{[duration(time), metres ? km(metres) : null].filter(Boolean).join(' · ')}</span>
            </div>
            <Card className="gap-0 py-0">
              {[...days.entries()].map(([date, rows]) => (
                <div key={date} className="flex flex-col border-t px-4 py-2 first:border-t-0">
                  <span className="flex min-h-8 items-center text-sm font-medium text-muted-foreground">{dayLabel(date)}</span>
                  {rows.map((a) => {
                    const sport = sportOf(a.sport)
                    const Icon = sport.icon
                    return (
                      <div key={a.id} className="flex min-h-14 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
                          <Icon className="size-[18px]" aria-hidden />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[17px] font-bold">{sport.label}</span>
                          {a.distance_m ? <span className="truncate text-xs text-muted-foreground">{km(a.distance_m)}</span> : null}
                        </span>
                        <span className="text-[17px] font-bold tabular-nums">{duration(a.duration_s)}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </Card>
          </section>
        )
      })}
    </div>
  )
}
