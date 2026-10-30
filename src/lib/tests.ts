// Which exercises are measured tests, and what the app asks for.
// A session whose exercises include one of these gets Left / Right number boxes
// in its log, saved to the tests table (one row per side). Adding a test is one line here.
export type TestSpec = { test: string; unit: string; label: string }

const BY_EXERCISE: Record<string, TestSpec> = {
  sl_heel_raise_test: { test: 'sl_heel_raise', unit: 'rip.', label: 'Ripetizioni per lato' },
}

export function testFor(exercises: string[]): TestSpec | null {
  for (const slug of exercises) if (BY_EXERCISE[slug]) return BY_EXERCISE[slug]
  return null
}

export type Side = 'L' | 'R'
export const SIDES: { side: Side; label: string; short: string }[] = [
  { side: 'L', label: 'Sinistra', short: 'S' },
  { side: 'R', label: 'Destra', short: 'D' },
]

// Results grouped per test day, oldest first: { date, L, R }
export type TestDay = { date: string; L: number | null; R: number | null }

export function testDays(rows: { date: string; side: string | null; value: number }[]): TestDay[] {
  const byDate = new Map<string, TestDay>()
  for (const r of rows) {
    const d = byDate.get(r.date) ?? { date: r.date, L: null, R: null }
    if (r.side === 'L' || r.side === 'R') d[r.side] = Number(r.value)
    byDate.set(r.date, d)
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
}

// The right (the side being worked on) as a share of the left: 100% means both sides alike
export function rightOfLeft(d: TestDay) {
  return d.L && d.R != null ? Math.round((d.R / d.L) * 100) : null
}
