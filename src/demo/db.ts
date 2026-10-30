// The demo's database: the same tables and row shapes as Supabase, kept in memory.
import type { Tables } from '@/lib/database.types'

export type Db = {
  plan_sessions: Tables<'plan_sessions'>[]
  session_logs: Tables<'session_logs'>[]
  symptoms: Tables<'symptoms'>[]
  activities: Tables<'activities'>[]
  tests: Tables<'tests'>[]
  weights: Tables<'weights'>[]
  reviews: Tables<'reviews'>[]
  videos: Tables<'videos'>[]
}

export const TABLES = ['plan_sessions', 'session_logs', 'symptoms', 'activities', 'tests', 'weights', 'reviews', 'videos'] as const satisfies readonly (keyof Db)[]

export function emptyDb(): Db {
  return Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Db
}

// A made-up user id for every demo row
export const DEMO_USER = '00000000-0000-4000-8000-000000000001'
