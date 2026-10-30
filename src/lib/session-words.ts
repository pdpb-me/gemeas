// How a session is named and described in lists
import type { DaySession } from '@/data/types'
import { exerciseFor } from '@/exercises/catalog'
import { capitalize, plural } from '@/lib/format'
import { sessionMinutes } from '@/lib/session-time'
import { testFor } from '@/lib/tests'

export const SLOT_WORD: Record<string, string> = { am: 'Mattina', pm: 'Sera' }
const KIND_WORD: Record<string, string> = {
  trainer: 'Personal trainer',
  strength: 'Forza',
  mobility: 'Mobilità',
  foot: 'Piede',
  pill: 'Pillola',
  test: 'Test',
}
export const kindWord = (kind: string) => KIND_WORD[kind] ?? capitalize(kind)

// The workouts that shouldn't sit next to each other without the coach knowing
export const isHeavy = (kind: string) => kind === 'trainer' || kind === 'strength'

// What a row says under the title before the session is logged, with a rough time:
// "3 esercizi + 1 video · ~13 min"
export function sessionMeta(s: DaySession) {
  const minutes = sessionMinutes(s)
  const time = minutes != null ? `~${minutes} min` : null // no-break space: "~32 min" wraps as one
  let what: string
  const test = testFor(s.exercises)
  if (s.kind === 'trainer') what = 'Lezione online'
  else if (test) what = 'Test · ripetizioni per lato'
  else {
    const exercises = s.exercises.filter((slug) => exerciseFor(slug)).length
    const parts = [exercises > 0 && plural(exercises, 'esercizio', 'esercizi'), s.videos.length > 0 && plural(s.videos.length, 'video', 'video')]
    what = parts.filter(Boolean).join(' + ')
  }
  if (!what) return [s.instructions, time].filter(Boolean).join(' · ')
  return [what, time].filter(Boolean).join(' · ')
}
