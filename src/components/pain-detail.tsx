import { useState } from 'react'
import { DetailScreen, RangeTabs } from '@/components/detail-parts'
import { RANGES, type RangeId } from '@/lib/ranges'
import { Card } from '@/components/ui/card'
import type { ProgressData } from '@/data/types'
import { addDays } from '@/lib/dates'
import { dayMonth, weekdayShort } from '@/lib/format'
import { painBand, painLabel, PAIN_LEVELS } from '@/lib/pain'
import { PAIN_DOT } from '@/lib/session-status'
import { average, compare, dailySeries, footSummary, zoneLine } from '@/lib/trends'
import { cn } from '@/lib/utils'

// Chart geometry (SVG units): plot from x 14 to 272, words on the right
const X0 = 14
const X1 = 272
// y for a 0–10 score: the zones get equal room (Nessuno 210, Lieve 150, Medio 90, Massimo 10)
const yPain = (s: number) => (s <= 2 ? 210 - s * 30 : s <= 5 ? 150 - (s - 2) * 20 : 90 - (s - 5) * 16)
const STROKE: Record<string, string> = { low: 'stroke-pain-low', mid: 'stroke-pain-mid', high: 'stroke-pain-high' }

// The foot over time: the last 7 days first (the state now), then the range's average and
// its trend, and the daily chart on the zones, with the walks marked under it.
export function PainDetail({ data, onBack }: { data: ProgressData; onBack: () => void }) {
  const [rangeId, setRangeId] = useState<RangeId>('4w')
  const range = RANGES.find((r) => r.id === rangeId)!
  const week = footSummary(data.symptoms, data.today)

  // The range starts at the first answer ever, if that's later (no empty months)
  const firstAnswer = dailySeries(data.symptoms, data.today, 364).find((d) => d.score != null)?.date
  const series = dailySeries(data.symptoms, data.today, range.days)
  const start = Math.max(
    0,
    series.findIndex((d) => d.date >= (firstAnswer ?? data.today)),
  )
  const shown = series.slice(start)
  const previous = dailySeries(data.symptoms, addDays(data.today, -range.days), range.days)
  const cmp = compare(
    series.map((d) => d.score),
    previous.map((d) => d.score),
  )
  const answered = shown.map((d, i) => ({ ...d, i })).filter((d): d is { date: string; score: number; i: number } => d.score != null)
  const avg = answered.length ? Math.round(average(answered.map((d) => d.score))) : null
  const n = Math.max(shown.length, 2)
  const x = (i: number) => X0 + (i * (X1 - X0)) / (n - 1)

  // Marks under the chart: a walk the day before
  const walkDays = new Set(data.walks.map((w) => w.date))
  const levels = PAIN_LEVELS.map((l) => ({ y: yPain(l.score), text: l.label }))
  const ticks = [0, 0.5, 1].map((f) => Math.round(f * (n - 1)))

  return (
    <DetailScreen title="Piede" sub="Piede destro, primi passi al mattino" onBack={onBack}>
      <Card className="gap-3 px-4 py-4">
        <span className="text-sm text-muted-foreground">Ultimi 7 giorni</span>
        {week.typical != null ? (
          <>
            <span className="flex items-center gap-2">
              <span className={cn('size-3.5 rounded-full', PAIN_DOT[painBand(week.typical)])} aria-hidden />
              <span className="text-hero font-semibold">{painLabel(week.typical)}</span>
            </span>
            <span className="text-sm text-muted-foreground">media degli ultimi 7 giorni</span>
            {week.latest && (
              <span className="flex items-center gap-1.5 text-sm">
                <span className="text-muted-foreground">Ultima risposta ({weekdayShort(week.latest.date)})</span>
                <span className={cn('size-2 rounded-full', PAIN_DOT[painBand(week.latest.score)])} aria-hidden />
                <span className="font-semibold">{painLabel(week.latest.score)}</span>
              </span>
            )}
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">{zoneLine(week)}</p>
          </>
        ) : (
          <span className="text-base font-semibold">Ancora poche risposte ({week.answered} giorni su 7)</span>
        )}
      </Card>

      <Card className="gap-3 px-4 py-4">
        <RangeTabs value={rangeId} onChange={setRangeId} />
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Media, {start > 0 ? `dal ${dayMonth(shown[0].date)}` : range.text}</span>
            <span className="flex items-center gap-2 text-xl font-semibold">
              {avg != null && <span className={cn('size-2.5 rounded-full', PAIN_DOT[painBand(avg)])} aria-hidden />}
              {avg != null ? painLabel(avg) : '–'}
            </span>
          </div>
          <span className="max-w-40 text-right text-sm text-muted-foreground">
            {cmp.verdict === 'none'
              ? 'Risposte non sufficienti per confrontare'
              : `${cmp.verdict === 'better' ? 'Meglio rispetto a' : cmp.verdict === 'worse' ? 'Peggio rispetto a' : 'Più o meno come'} ${range.before}`}
          </span>
        </div>

        <svg viewBox="0 0 350 235" className="w-full" role="img" aria-label={`Piede per giorno, ${range.text}`}>
          <rect x="0" y="10" width="4" height="80" className="fill-pain-high" />
          <rect x="0" y="90" width="4" height="60" className="fill-pain-mid" />
          <rect x="0" y="150" width="4" height="60" className="fill-pain-low" />
          {levels.map((l) => (
            <g key={l.text}>
              <line x1="8" x2={X1 + 4} y1={l.y} y2={l.y} className="stroke-border" strokeDasharray={l.y === 210 ? undefined : '3 3'} />
              <text x={X1 + 8} y={l.y + 4} className="fill-muted-foreground text-[11px]">
                {l.text}
              </text>
            </g>
          ))}
          <polyline
            points={answered.map((d) => `${x(d.i).toFixed(1)},${yPain(d.score).toFixed(1)}`).join(' ')}
            fill="none"
            className="stroke-foreground/50"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {answered.map((d) => (
            <circle
              key={d.date}
              cx={x(d.i)}
              cy={yPain(d.score)}
              r={n > 35 ? 2.6 : 4.2}
              className={cn('fill-card', STROKE[painBand(d.score)])}
              strokeWidth="2"
            />
          ))}
          {ticks.map((i, k) => (
            <text
              key={k}
              x={x(i)}
              y="230"
              textAnchor={k === 0 ? 'start' : k === ticks.length - 1 ? 'end' : 'middle'}
              className="fill-muted-foreground text-[12px]"
            >
              {dayMonth(shown[i]?.date ?? data.today)}
            </text>
          ))}
          <line x1="8" x2="8" y1="10" y2="210" className="stroke-border" />
        </svg>

        {/* Same frame as the chart, so each mark sits under its day */}
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-[2px] bg-foreground/70" aria-hidden />
            Camminata il giorno prima
          </span>
          <svg viewBox="0 0 350 12" className="w-full" aria-hidden>
            <line x1="8" x2={X1 + 4} y1="6" y2="6" className="stroke-border" />
            {shown.map((d, i) =>
              walkDays.has(addDays(d.date, -1)) ? <rect key={d.date} x={x(i) - 3.5} y="2.5" width="7" height="7" rx="1.5" className="fill-foreground/70" /> : null,
            )}
          </svg>
        </div>
      </Card>
    </DetailScreen>
  )
}
