import type {
  ActivityRow,
  CheckIns,
  DayDot,
  DaySession,
  Effort,
  LastLog,
  PainTarget,
  ProgressData,
  Review,
  Status,
  TestRow,
  TestTarget,
} from '@/data/types'

// Everything the app reads and writes, in its own words. Two implementations:
// src/data/supabase.ts (the real app) and src/demo/memory.ts (the demo, made-up data).
// Both follow src/data/rules.ts. Reads and writes throw an Error with a plain message.
//
// Writes name what they change by id or by date and say the result wanted; each backend
// works from what the database holds then, never from a copy a screen loaded earlier.
export interface Backend {
  auth: {
    signedIn(): Promise<boolean>
    onChange(listener: (signedIn: boolean) => void): () => void
    sendCode(email: string): Promise<void>
    verify(email: string, code: string): Promise<void>
    signOut(): Promise<void>
  }

  // Reads
  day(date: string): Promise<DaySession[]>
  weekDots(from: string, to: string): Promise<Record<string, DayDot[]>> // pills stay out
  checkIns(date: string): Promise<CheckIns>
  lastLog(before: string): Promise<LastLog> // the latest day before this one with a log or a check-in
  progress(today: string): Promise<ProgressData>
  nextTest(today: string): Promise<{ date: string } | null>
  testResults(test: string): Promise<TestRow[]> // every result of one test, oldest first
  activities(from: string, to: string): Promise<ActivityRow[]> // newest first
  oldestActivityDate(): Promise<string | null>
  review(weekStart: string): Promise<Review | null> // the coach's note for that week, or the latest before it

  // Writes
  setStatus(planSessionId: string, status: Status | null): Promise<void>
  setEffort(planSessionId: string, effort: Effort | null): Promise<void>
  setPain(planSessionId: string, area: PainTarget, score: number | null): Promise<void>
  setComment(planSessionId: string, comment: string | null): Promise<void>
  setTest(planSessionId: string, spec: TestTarget, side: string, value: number | null): Promise<void>
  moveSession(planSessionId: string, date: string, slot: string): Promise<void>
  saveCheckIn(date: string, score: number | null): Promise<void>
  saveWeight(date: string, kg: number | null): Promise<void>
  addWalk(date: string, minutes: number, km: number | null): Promise<void>
  removeWalk(id: string): Promise<void>
  syncWatch(): Promise<void> // asks the server to copy new activities from the watch
}
