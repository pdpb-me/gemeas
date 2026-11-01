import { toast } from 'sonner'
import type { Backend } from '@/data/api'
import { backend } from '@/data/backend'
import { getPref, setPref } from '@/lib/prefs'

// The app's door to the data.
// - Reads go straight to the backend; each names the tables it reads (for reloading).
// - Writes run one at a time, in the order they were tapped, so two quick taps can't
//   race. When a write is done, only the screens that read the tables it touched
//   reload. If saving fails, a short message says so (and the screens reload, so they
//   show what is really saved).
export type Table = 'plan_sessions' | 'session_logs' | 'symptoms' | 'activities' | 'tests' | 'weights' | 'reviews' | 'videos' | 'chat_messages'

const listeners = new Set<(tables: Set<Table>) => void>()

export function onDataChange(listener: (tables: Set<Table>) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function changed(tables: Table[]) {
  const set = new Set(tables)
  for (const l of listeners) l(set)
}

// What each read looks at
export const READS = {
  day: ['plan_sessions', 'session_logs', 'symptoms', 'tests', 'videos'],
  weekDots: ['plan_sessions', 'session_logs'],
  checkIns: ['symptoms', 'weights'],
  lastLog: ['session_logs', 'symptoms'],
  progress: ['symptoms', 'activities', 'tests', 'weights'],
  nextTest: ['plan_sessions'],
  testResults: ['tests'],
  activities: ['activities'],
  oldestActivityDate: ['activities'],
  review: ['reviews'],
  chatMessages: ['chat_messages'],
} satisfies Partial<Record<keyof Backend, Table[]>>

// What each write touches
const WRITES = {
  setStatus: ['session_logs', 'symptoms', 'tests'],
  setEffort: ['session_logs'],
  setPain: ['symptoms'],
  setComment: ['session_logs'],
  setTest: ['tests'],
  moveSession: ['plan_sessions', 'symptoms', 'tests'],
  saveCheckIn: ['symptoms'],
  saveWeight: ['weights'],
  addWalk: ['activities'],
  removeWalk: ['activities'],
} satisfies Partial<Record<keyof Backend, Table[]>>

export const data = {
  auth: backend.auth,
  day: backend.day,
  weekDots: backend.weekDots,
  checkIns: backend.checkIns,
  lastLog: backend.lastLog,
  progress: backend.progress,
  nextTest: backend.nextTest,
  testResults: backend.testResults,
  activities: backend.activities,
  oldestActivityDate: backend.oldestActivityDate,
  review: backend.review,
  coachAvailable: backend.coachAvailable,
  chatMessages: backend.chatMessages,
} satisfies Partial<Backend>

// One write at a time
let queue: Promise<unknown> = Promise.resolve()
function serial<T>(run: () => Promise<T>): Promise<T> {
  const next = queue.then(run, run)
  queue = next.catch(() => {})
  return next
}

// A failed save in plain words (the technical message stays in the console)
function failed(what: string, e: unknown) {
  console.error(e)
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  toast.error(`${what}. ${offline ? 'Sembra che tu sia offline.' : 'Controlla la connessione e riprova.'}`)
}

type Saved<F> = F extends (...args: infer A) => Promise<unknown> ? (...args: A) => Promise<boolean> : never

function save<K extends keyof typeof WRITES>(name: K, what = 'Non salvato'): Saved<Backend[K]> {
  const run = backend[name] as (...args: unknown[]) => Promise<unknown>
  return ((...args: unknown[]) =>
    serial(async () => {
      try {
        await run(...args)
        return true
      } catch (e) {
        failed(what, e)
        return false
      } finally {
        changed(WRITES[name] as Table[])
      }
    })) as Saved<Backend[K]>
}

export const write = {
  setStatus: save('setStatus'),
  setEffort: save('setEffort'),
  setPain: save('setPain', 'Dolore non salvato'),
  setComment: save('setComment', 'Nota non salvata'),
  setTest: save('setTest', 'Risultato non salvato'),
  moveSession: save('moveSession', 'Non spostato'),
  saveCheckIn: save('saveCheckIn'),
  saveWeight: save('saveWeight', 'Peso non salvato'),
  addWalk: save('addWalk', 'Camminata non salvata'),
  removeWalk: save('removeWalk', 'Camminata non rimossa'),
}

// A message to the coach. Not one of the writes above: the reply can take a while, and
// nothing else should wait for it. Answers with what went wrong, in plain words, or null.
export async function sendChat(text: string, onReply: (soFar: string) => void): Promise<string | null> {
  try {
    await backend.sendChat(text, onReply)
    return null
  } catch (e) {
    console.error(e)
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    return offline ? 'Sembra che tu sia offline.' : e instanceof Error ? e.message : 'Il messaggio non è partito.'
  } finally {
    changed(['chat_messages'])
  }
}

// New activities from the watch, at most once an hour. Quiet if it fails: the night's sync
// tries again, and nothing she typed depends on it.
const WATCH_SYNC_EVERY = 60 * 60_000

export async function syncWatch() {
  if (Date.now() - Number(getPref('watch-synced') ?? 0) < WATCH_SYNC_EVERY) return
  setPref('watch-synced', String(Date.now()))
  try {
    await backend.syncWatch()
    changed(['activities'])
  } catch (e) {
    console.error(e)
  }
}

// Everything may have changed elsewhere (the coach): reload all
export function refreshAll() {
  changed(['plan_sessions', 'session_logs', 'symptoms', 'activities', 'tests', 'weights', 'reviews', 'videos', 'chat_messages'])
}
