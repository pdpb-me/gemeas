// A rough time for a session, shown in Today's plan as "~25 min".
// Drawn exercises: their typical time (catalog). Videos: their real length. A lesson with
// the trainer: its usual length.
import { exerciseFor } from '@/exercises/catalog'
import type { DaySession } from '@/data/types'
import { dogForSport } from '@/lib/dachshunds'

const LESSON_MINUTES = 45

// A walk, run or ride has no set length: after it, the log asks how long it was
export const asksMinutes = (kind: string) => dogForSport(kind) != null

export function sessionMinutes(s: Pick<DaySession, 'kind' | 'exercises'> & { videos: { duration_s: number | null }[] }): number | null {
  // How long she goes out is up to her: a stretching video after it says nothing about that
  if (dogForSport(s.kind)) return null
  let total = 0
  let known = false
  for (const slug of s.exercises) {
    const ex = exerciseFor(slug)
    if (ex) {
      total += ex.minutes
      known = true
    }
  }
  for (const v of s.videos) {
    if (v.duration_s != null) {
      total += v.duration_s / 60
      known = true
    }
  }
  if (s.kind === 'trainer' && !known) return LESSON_MINUTES
  return known ? Math.max(1, Math.round(total)) : null
}
