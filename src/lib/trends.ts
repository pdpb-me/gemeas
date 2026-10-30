// How the foot is measured and summed up over time (Progress screen).
// One answer per day, in the morning (first steps).
import { FOOT, FOOT_TIMING } from '@/data/rules'
import { addDays } from '@/lib/dates'
import { painLabel } from '@/lib/pain'

export type Symptom = { date: string; body_area: string; timing: string; score: number }

// One value per day (the highest that day), null when not answered; oldest first, `to` last
export function dailySeries(symptoms: Symptom[], to: string, days: number) {
  const byDay = new Map<string, number>()
  for (const s of symptoms) {
    if (s.body_area !== FOOT.body_area || s.timing !== FOOT_TIMING) continue
    byDay.set(s.date, Math.max(byDay.get(s.date) ?? 0, s.score))
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(to, i - days + 1)
    return { date, score: byDay.get(date) ?? null }
  })
}

const MIN_ANSWERS = 3 // per period, before comparing
const CHANGE = 1 // average points (0–10) that count as a real change

export const average = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length

// Compare the last `days` with the `days` before: better / same / worse, or not enough answers
export function compare(now: (number | null)[], before: (number | null)[]) {
  const a = now.filter((x): x is number => x != null)
  const b = before.filter((x): x is number => x != null)
  if (a.length < MIN_ANSWERS || b.length < MIN_ANSWERS)
    return {
      verdict: 'none' as const,
      now: a.length ? average(a) : null,
      before: b.length ? average(b) : null,
      counts: [a.length, b.length],
    }
  const n = average(a)
  const p = average(b)
  return {
    verdict: n <= p - CHANGE ? ('better' as const) : n >= p + CHANGE ? ('worse' as const) : ('same' as const),
    now: n,
    before: p,
    counts: [a.length, b.length],
  }
}

export const VERDICT_TEXT = {
  better: 'Meglio della settimana prima',
  same: 'Più o meno come la settimana prima',
  worse: 'Peggio della settimana prima',
  none: 'Risposte non sufficienti per confrontare',
}

// The zones: ≤ 3 OK, 4–6 hold or back off, 7+ stop, each with what to do
export function zoneText(score: number) {
  return score <= 3 ? 'zona OK' : score <= 6 ? 'non aumentare' : 'zona stop'
}

export function zoneAction(score: number) {
  return score <= 3 ? 'Allenati come da piano.' : score <= 6 ? 'Mantieni il carico, senza aggiungere.' : 'Riposa il piede oggi e avvisa il coach.'
}

// One line on what the last 7 days mean: about the latest answer when it's worse than
// the week's average (a flare shouldn't hide behind the average), else about the week
export function zoneLine(s: AreaSummary) {
  if (s.typical == null) return null
  const latestWorse = s.latest != null && s.latest.score > s.typical && painLabel(s.latest.score) !== painLabel(s.typical)
  const score = latestWorse ? s.latest!.score : s.typical
  const lead = latestWorse ? `Ultima risposta ${painLabel(score)}` : 'Questa settimana'
  return `${lead}: ${zoneText(score)}. ${zoneAction(score)}`
}

export type AreaSummary = {
  series: { date: string; score: number | null }[] // 14 days, oldest first, today last
  answered: number // answers in the last 7 days
  typical: number | null // the last 7 days' average, rounded (null with fewer than 3 answers)
  latest: { date: string; score: number } | null // the latest answer in the last 7 days
  worst: number | null // the worse of typical and latest: the colour to show
  verdict: 'better' | 'same' | 'worse' | 'none' // last 7 days against the 7 before
}

// The foot over the last 7 days (and the 7 before), for its card on Progress
export function footSummary(symptoms: Symptom[], today: string): AreaSummary {
  const series = dailySeries(symptoms, today, 14)
  const scores = series.map((d) => d.score)
  const week = series.slice(7).filter((d): d is { date: string; score: number } => d.score != null)
  const typical = week.length >= MIN_ANSWERS ? Math.round(average(week.map((d) => d.score))) : null
  const latest = week[week.length - 1] ?? null
  const worst = typical == null ? null : Math.max(typical, latest?.score ?? 0)
  return {
    series,
    answered: week.length,
    typical,
    latest,
    worst,
    verdict: compare(scores.slice(7), scores.slice(0, 7)).verdict,
  }
}

// One sentence for the top of Progress: "Piede meglio della settimana prima."
// A hard latest answer comes first: "Piede Forte ven." (a flare shouldn't hide behind the week)
export function headline(verdict: AreaSummary['verdict'], flare?: string) {
  const text = {
    worse: 'Piede peggio della settimana prima.',
    better: 'Piede meglio della settimana prima.',
    same: 'Piede più o meno come la settimana prima.',
    none: 'Ancora poche risposte per confrontare le settimane.',
  }[verdict]
  return flare ? `${flare} ${text}` : text
}
