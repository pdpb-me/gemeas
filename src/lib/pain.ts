// Five pain levels, stored as 0-10 so the "<= 3/10 is acceptable" rule still applies.
export const PAIN_LEVELS = [
  { score: 0, label: 'Nessuno', band: 'low' },
  { score: 2, label: 'Lieve', band: 'low' },
  { score: 5, label: 'Medio', band: 'mid' },
  { score: 8, label: 'Forte', band: 'high' },
  { score: 10, label: 'Massimo', band: 'high' },
] as const

export type PainBand = (typeof PAIN_LEVELS)[number]['band']

// Any 0-10 score (e.g. one Claude wrote) maps to the level whose band it's in
export function painLevelFor(score: number) {
  if (score === 0) return 0
  if (score <= 3) return 2
  if (score <= 6) return 5
  if (score <= 8) return 8
  return 10
}

export function painLabel(score: number) {
  const level = painLevelFor(score)
  return PAIN_LEVELS.find((l) => l.score === level)!.label
}

// A day's bar in a chart, as a share of the chart's height. The zones get equal room,
// and "Nessuno" still shows a small bar: no bar means no answer.
export function painHeight(score: number) {
  return Math.max(6, score <= 2 ? score * 15 : score <= 5 ? 30 + (score - 2) * 10 : 60 + (score - 5) * 8)
}

export function painBand(score: number): PainBand {
  const level = painLevelFor(score)
  return PAIN_LEVELS.find((l) => l.score === level)!.band
}
