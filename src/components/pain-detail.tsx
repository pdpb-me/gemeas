import { useState } from 'react'
import { DetailScreen, RangeTabs } from '@/components/detail-parts'
import { RANGES, type RangeId } from '@/lib/ranges'
import { Card } from '@/components/ui/card'
import type { ProgressData } from '@/data/types'
import { addDays } from '@/lib/dates'
import { dayMonth, weekdayShort } from '@/lib/format'
import { painBand, painHeight, painLabel } from '@/lib/pain'
import { PAIN_DOT } from '@/lib/session-status'
import { average, compare, dailySeries, footSummary, zoneLine } from '@/lib/trends'
import { cn } from '@/lib/utils'

// Where one zone ends and the next begins, in the chart
const LIMITS = [
  { text: 'Medio', height: painHeight(3.5) },
  { text: 'Forte', height: painHeight(6.5) },
]
const LEGEND = [
  { band: 'low', text: 'Nessuno, lieve' },
  { band: 'mid', text: 'Medio' },
  { band: 'high', text: 'Forte, massimo' },
] as const

// The foot over time: the last 7 days first (the state now), then the range's average and
// its trend, and the daily bars on the zones, with the walks marked under them.
export function PainDetail({ data, onBack }: { data: ProgressData; onBack: () => void }) {
  const [rangeId, setRangeId] = useState<RangeId>('4w')
  const [picked, setPicked] = useState<string | null>(null)
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
  const answered = shown.filter((d): d is { date: string; score: number } => d.score != null)
  const avg = answered.length ? Math.round(average(answered.map((d) => d.score))) : null
  // The readout: the tapped bar, or the latest answer
  const current = answered.find((d) => d.date === picked) ?? answered[answered.length - 1]

  // Marks under the chart: a walk the day before
  const walkDays = new Set(data.walks.map((w) => w.date))

  return (
    <DetailScreen title="Piede" sub="Piede destro, primi passi al mattino" onBack={onBack}>
      <Card className="gap-3 px-4 py-4">
        <span className="text-sm text-muted-foreground">Ultimi 7 giorni</span>
        {week.typical != null ? (
          <>
            <span className="flex items-center gap-2">
              <span className={cn('size-3 border-2', PAIN_DOT[painBand(week.typical)])} aria-hidden />
              <span className="text-hero font-bold">{painLabel(week.typical)}</span>
            </span>
            <span className="text-sm text-muted-foreground">media degli ultimi 7 giorni</span>
            {week.latest && (
              <span className="flex items-center gap-1.5 text-sm">
                <span className="text-muted-foreground">Ultima risposta ({weekdayShort(week.latest.date)})</span>
                <span className={cn('chip', PAIN_DOT[painBand(week.latest.score)])}>{painLabel(week.latest.score)}</span>
              </span>
            )}
            <p className="banner">{zoneLine(week)}</p>
          </>
        ) : (
          <span className="text-[17px] font-bold">Ancora poche risposte ({week.answered} giorni su 7)</span>
        )}
      </Card>

      <Card className="gap-3 px-4 py-4">
        <RangeTabs value={rangeId} onChange={setRangeId} />
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Media, {start > 0 ? `dal ${dayMonth(shown[0].date)}` : range.text}</span>
            <span className="flex items-center gap-2 text-h2 font-bold">
              {avg != null && <span className={cn('size-3 border-2', PAIN_DOT[painBand(avg)])} aria-hidden />}
              {avg != null ? painLabel(avg) : '–'}
            </span>
          </div>
          <span className="max-w-40 text-right text-sm text-muted-foreground">
            {cmp.verdict === 'none'
              ? 'Risposte non sufficienti per confrontare'
              : `${cmp.verdict === 'better' ? 'Meglio rispetto a' : cmp.verdict === 'worse' ? 'Peggio rispetto a' : 'Più o meno come'} ${range.before}`}
          </span>
        </div>

        <div className="readout" aria-live="polite">
          <span>{current ? dayMonth(current.date) : 'Nessuna risposta'}</span>
          {current && <b>{painLabel(current.score)}</b>}
        </div>
        <div className="plot-wrap">
        <div className="plot" role="group" aria-label={`Piede per giorno, ${range.text}`}>
          {shown.map((d) =>
            d.score == null ? (
              <div key={d.date} className="bar" />
            ) : (
              <button
                key={d.date}
                type="button"
                className={cn('bar', current?.date === d.date && 'picked')}
                aria-label={`${dayMonth(d.date)}: ${painLabel(d.score)}`}
                onClick={() => setPicked(d.date)}
              >
                <span className={PAIN_DOT[painBand(d.score)]} style={{ height: `${painHeight(d.score)}%` }} />
              </button>
            ),
          )}
          {LIMITS.map((l) => (
            <div key={l.text} className="limit" style={{ top: `${100 - l.height}%` }}>
              <span>{l.text}</span>
            </div>
          ))}
        </div>
        </div>

        {/* One cell per day, like the bars, so each mark sits under its day */}
        <div className="flex h-2 gap-0.5" aria-hidden>
          {shown.map((d) => (
            <span key={d.date} className={cn('flex-1', walkDays.has(addDays(d.date, -1)) && 'bg-muted-foreground')} />
          ))}
        </div>
        <div className="x-axis pl-0">
          <span>{dayMonth(shown[0]?.date ?? data.today)}</span>
          <span>{dayMonth(shown[Math.floor((shown.length - 1) / 2)]?.date ?? data.today)}</span>
          <span>{dayMonth(shown[shown.length - 1]?.date ?? data.today)}</span>
        </div>
        <div className="legend">
          {LEGEND.map((l) => (
            <span key={l.band}>
              <i className={PAIN_DOT[l.band]} />
              {l.text}
            </span>
          ))}
          <span className="font-medium text-muted-foreground">
            <i className="h-2 border-0 bg-muted-foreground" />
            Camminata il giorno prima
          </span>
        </div>
      </Card>
    </DetailScreen>
  )
}
