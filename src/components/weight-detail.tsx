import { useState } from 'react'
import { DetailScreen, RangeTabs } from '@/components/detail-parts'
import { RANGES, type RangeId } from '@/lib/ranges'
import { Card } from '@/components/ui/card'
import type { ProgressData } from '@/data/types'
import { addDays, daysBetween } from '@/lib/dates'
import { dayMonth, decimal, kg as kgText, plural } from '@/lib/format'
import { averageKg } from '@/lib/weight'

const X0 = 10
const X1 = 300

// Weight over time: each entry as a dot, and the weekly average as a line. Numbers only:
// no goal, and no comment on whether it went up or down.
export function WeightDetail({ data, onBack }: { data: ProgressData; onBack: () => void }) {
  const [rangeId, setRangeId] = useState<RangeId>('4w')
  const range = RANGES.find((r) => r.id === rangeId)!
  const from = addDays(data.today, -(range.days - 1))
  const entries = data.weights.filter((w) => w.date >= from && w.date <= data.today)
  const now = averageKg(data.weights, from, data.today)
  const last = data.weights[data.weights.length - 1]

  // Weekly averages (7-day blocks ending today), drawn at the middle of each block
  const weeks = Array.from({ length: Math.ceil(range.days / 7) }, (_, k) => {
    const end = addDays(data.today, -7 * k)
    const avg = averageKg(data.weights, addDays(end, -6), end)
    return avg ? { date: addDays(end, -3), kg: avg.kg } : null
  })
    .filter((w): w is { date: string; kg: number } => w != null && w.date >= from)
    .reverse()

  const all = entries.map((e) => e.kg)
  const lo = Math.floor(Math.min(...all, Infinity) - 0.5)
  const hi = Math.ceil(Math.max(...all, -Infinity) + 0.5)
  const y = (kg: number) => 200 - ((kg - lo) / Math.max(hi - lo, 1)) * 180
  const x = (date: string) => X0 + (daysBetween(from, date) / (range.days - 1)) * (X1 - X0)
  const gridKg = entries.length ? [lo, (lo + hi) / 2, hi] : []

  return (
    <DetailScreen title="Peso" sub="Al mattino, dopo il bagno, prima di bere o mangiare" onBack={onBack}>
      <Card className="gap-3 px-4 py-4">
        <RangeTabs value={rangeId} onChange={setRangeId} />
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Media, {range.text}</span>
            <span className="font-mono text-hero font-medium tabular-nums">{now ? decimal(now.kg) : '–'}</span>
            <span className="text-sm text-muted-foreground">{now ? `kg · ${plural(now.n, 'valore', 'valori')}` : 'Nessun valore'}</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-sm text-muted-foreground">{last ? `Ultimo, ${dayMonth(last.date)}` : 'Ancora nessun valore'}</span>
            <span className="text-h2 font-medium tabular-nums">{last ? kgText(last.kg) : '–'}</span>
          </div>
        </div>

        {entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nessun peso in questo periodo. Puoi aggiungerlo nel check-in del mattino, su Oggi.</p>
        ) : (
          <svg viewBox="0 0 350 225" className="w-full" role="img" aria-label={`Peso, ${range.text}`}>
            {gridKg.map((kg) => (
              <g key={kg}>
                <text x={X1 + 10} y={y(kg) + 4} className="fill-muted-foreground font-mono text-[12px]">
                  {kg % 1 === 0 ? kg : decimal(kg)}
                </text>
              </g>
            ))}
            {weeks.length >= 2 && (
              <polyline
                points={weeks.map((w) => `${x(w.date).toFixed(1)},${y(w.kg).toFixed(1)}`).join(' ')}
                fill="none"
                className="stroke-foreground"
                strokeWidth="2.5"
              />
            )}
            {entries.map((e) => (
              <rect
                key={e.date}
                x={x(e.date) - (range.days > 28 ? 2 : 3.5)}
                y={y(e.kg) - (range.days > 28 ? 2 : 3.5)}
                width={range.days > 28 ? 4 : 7}
                height={range.days > 28 ? 4 : 7}
                className="fill-muted-foreground"
              />
            ))}
            {[0, 0.5, 1].map((f) => {
              const d = addDays(from, Math.round(f * (range.days - 1)))
              return (
                <text
                  key={f}
                  x={x(d)}
                  y="220"
                  textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}
                  className="fill-muted-foreground font-mono text-[12px]"
                >
                  {dayMonth(d)}
                </text>
              )
            })}
          </svg>
        )}
        <div className="flex gap-4 text-xs font-bold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 bg-muted-foreground" aria-hidden />
            Ogni valore
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-foreground" aria-hidden />
            Media settimanale
          </span>
        </div>
      </Card>
    </DetailScreen>
  )
}
