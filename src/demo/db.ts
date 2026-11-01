// The demo's database: the same tables and row shapes as Supabase, kept in memory.
import type { ChatMessage, Proposal } from '@/data/types'
import type { Tables } from '@/lib/database.types'

// The little the demo's coach proposes
export type DemoChange =
  | { op: 'move'; session_id: string; before: { date: string; slot: string }; after: { date: string; slot: string } }
  | { op: 'note'; after: { week_start: string; decisions: string } }

export type Db = {
  plan_sessions: Tables<'plan_sessions'>[]
  session_logs: Tables<'session_logs'>[]
  symptoms: Tables<'symptoms'>[]
  activities: Tables<'activities'>[]
  tests: Tables<'tests'>[]
  weights: Tables<'weights'>[]
  reviews: Tables<'reviews'>[]
  videos: Tables<'videos'>[]
  chat_messages: ChatMessage[]
  chat_proposals: (Proposal & { changes: DemoChange[] })[]
}

export const TABLES = ['plan_sessions', 'session_logs', 'symptoms', 'activities', 'tests', 'weights', 'reviews', 'videos', 'chat_messages', 'chat_proposals'] as const satisfies readonly (keyof Db)[]

export function emptyDb(): Db {
  return Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Db
}

// A made-up user id for every demo row
export const DEMO_USER = '00000000-0000-4000-8000-000000000001'
