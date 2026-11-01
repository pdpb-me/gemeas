// The shapes the screens work with. Rows come from the tables in database.types.ts;
// a few are joined or trimmed for one screen.
import type { Tables } from '@/lib/database.types'

export type Symptom = Tables<'symptoms'>
export type SessionLog = Tables<'session_logs'> & { symptoms: Symptom[] }
export type Video = Tables<'videos'>
export type TestResult = Tables<'tests'>
export type Review = Pick<Tables<'reviews'>, 'id' | 'week_start' | 'summary' | 'decisions' | 'created_at'>
export type Status = 'done' | 'partial' | 'skipped'
export type Effort = 'light' | 'medium' | 'hard'

export type ActivityRow = Pick<Tables<'activities'>, 'id' | 'date' | 'sport' | 'source' | 'duration_s' | 'distance_m'>

export type DaySession = Tables<'plan_sessions'> & {
  log: SessionLog | null
  tests: TestResult[] // measured results (e.g. heel-raise reps, L and R), for test sessions
  videos: Video[]
}

// A planned session she logged as done or in part, for the history of activities
export type DoneSession = Pick<Tables<'plan_sessions'>, 'id' | 'date' | 'kind' | 'title' | 'exercises'> & {
  status: string
  minutes: number | null
  videos: { duration_s: number | null }[]
}

export type DayDot ={ id: string; slot: string; kind: string; status: string | null }

// Was anything logged lately? (for the "welcome back" line)
export type LastLog = { date: string } | null

// The morning check-in: the foot at first steps, and the weight if she likes
export type CheckIns = {
  foot: number | null
  weight: number | null // kg
}

// One message in the chat with the coach
export type ChatMessage = { id: string; role: 'user' | 'coach'; text: string; created_at: string }

// What the coach proposes: it changes the plan only if she applies it
export type Proposal = Pick<Tables<'plan_proposals'>, 'id' | 'summary' | 'lines' | 'status' | 'created_at'>

export type TrendSymptom = { date: string; body_area: string; timing: string; score: number }

export type ProgressData = {
  today: string
  symptoms: TrendSymptom[] // a year, so 6 months can be compared with the 6 before
  walks: { date: string }[] // 6 months: marks under the foot's chart
  tests: Pick<Tables<'tests'>, 'date' | 'test' | 'side' | 'value' | 'unit'>[]
  weights: { date: string; kg: number }[] // a year, oldest first
}

export type TestRow = { date: string; side: string | null; value: number; plan_session_id: string | null }

export type PainTarget = { body_area: string; side: string | null }
export type TestTarget = { test: string; unit: string }
