// The rules for rows the app writes, shared by both backends (Supabase and the demo's
// memory) and the simulator, so they can't drift apart. No Supabase import here.
import type { Status } from '@/data/types'

// Kinds are free text written by the coach: compare them in lower case
export const kindOf = (kind: string) => kind.trim().toLowerCase()

// A pill: a few minutes before or after a workout. It stays out of the week's dots and counts.
export const isPill = (kind: string) => kindOf(kind) === 'pill'

// A status that means the session happened (it counts as done)
export const happened = (status: string | null | undefined): status is 'done' | 'partial' => status === 'done' || status === 'partial'

// What a new status removes: skipped (or a cleared log) can't have pain during, a "how hard"
// answer or test results: they all need the session to have happened.
export function clearsOnStatus(status: Status | null) {
  const gone = !happened(status)
  return { pain: gone, effort: gone, tests: gone }
}

// The one tracked area, in one place
export const FOOT = { body_area: 'foot', side: 'R' }
export const FOOT_TIMING = 'next_morning'

// The morning check-in's row: one per day, no session
export function checkInRow(date: string, score: number) {
  return { date, body_area: FOOT.body_area, side: FOOT.side, timing: FOOT_TIMING, score, context: 'morning check-in' }
}

// A walk typed in by hand
export function walkRow(date: string, minutes: number, km: number | null) {
  return {
    date,
    sport: 'walk',
    source: 'manual',
    duration_s: Math.round(minutes * 60),
    distance_m: km == null ? null : Math.round(km * 1000),
  }
}

// What the database accepts (see supabase/migrations): the demo checks the same
export const LIMITS = {
  score: (n: number) => Number.isInteger(n) && n >= 0 && n <= 10,
  kg: (n: number) => n >= 30 && n <= 250,
  slot: (s: string) => s === 'am' || s === 'pm',
  status: (s: string) => s === 'done' || s === 'partial' || s === 'skipped',
  effort: (s: string) => s === 'light' || s === 'medium' || s === 'hard',
  minutes: (n: number) => Number.isFinite(n) && n >= 1 && n <= 600,
  km: (n: number) => Number.isFinite(n) && n > 0 && n <= 100,
}

export function check(ok: boolean, what: string) {
  if (!ok) throw new Error(`Valore non valido: ${what}`)
}
