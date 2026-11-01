// The demo's state: which made-up moment it is, and the in-memory database at that
// moment (plus whatever you tapped). Kept in this browser (localStorage), so a reload
// keeps your place. Scripts and reviewers can drive it from the console: window.gemeasDemo.
import { now, setNow } from '@/lib/clock'
import { addDays, toISODate } from '@/lib/dates'
import { DEMO_USER, emptyDb, TABLES, type Db } from '@/demo/db'
import { SCENARIOS, type Scenario } from '@/demo/scenarios'
import { at, buildWorld, snapshot } from '@/demo/simulate'

export { SCENARIOS }

type Saved = { v: 1; scenario: string; at: string; db: Db }
const KEY = 'gemeas-demo:v1'

let world: Db | null = null
const getWorld = () => (world ??= buildWorld())

let state: Saved = load() ?? fresh(SCENARIOS[0])
setNow(new Date(state.at))

// Rows the coaching chat writes leave these columns to their defaults
const DEFAULTS: Partial<Record<keyof Db, Record<string, unknown>>> = {
  plan_sessions: { exercises: [], video_ids: [], position: 0, block: null, instructions: null },
  reviews: { summary: null, decisions: null },
  symptoms: { side: null, context: null, session_log_id: null, timing: 'general' },
  tests: { side: null, unit: null, notes: null, plan_session_id: null },
}

function fresh(s: Scenario): Saved {
  const moment = new Date(s.at)
  return { v: 1, scenario: s.id, at: moment.toISOString(), db: s.empty ? emptyDb() : snapshot(getWorld(), moment) }
}

function load(): Saved | null {
  // ?scenario=<id> in the address opens that moment fresh (handy for links and screenshots)
  const url = new URL(location.href)
  const param = url.searchParams.get('scenario')
  const s = param && SCENARIOS.find((x) => x.id === param)
  if (param) {
    url.searchParams.delete('scenario')
    history.replaceState(history.state, '', url) // a reload keeps what you tapped
  }
  if (s) return fresh(s)
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null
    // saved before the demo had a chat: keep the place
    if (saved?.db) {
      saved.db.chat_messages ??= []
      saved.db.chat_proposals ??= []
    }
    return saved?.v === 1 && TABLES.every((t) => Array.isArray(saved.db[t])) ? saved : null
  } catch {
    return null
  }
}

function persist() {
  state.at = now().toISOString() // the clock kept ticking: remember where it is
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Private window or full storage: the demo still works, it just forgets on reload
  }
}

// A new moment or scenario: start the app afresh on it (screens, drawers, data)
function restart() {
  persist()
  const url = new URL(location.href)
  url.searchParams.delete('scenario')
  location.replace(url)
}

export const demo = {
  db: () => state.db,
  scenario: () => SCENARIOS.find((s) => s.id === state.scenario) ?? SCENARIOS[0],
  // The demo's "now" when it was last moved (the clock keeps ticking from there)
  at: () => new Date(state.at),

  // A write in the app: remember it
  saved() {
    persist()
  },

  open(id: string) {
    const s = SCENARIOS.find((x) => x.id === id)
    if (!s) return
    state = fresh(s)
    setNow(new Date(state.at))
    restart()
  },

  // Move the clock. What the coach would have added by then appears;
  // your own logs and check-ins never fill in by themselves (that's for you to do).
  moveTo(moment: Date) {
    const before = state.at
    const t = moment.toISOString()
    if (state.scenario !== 'day-one' && t > before) {
      const next = snapshot(getWorld(), moment)
      for (const table of ['plan_sessions', 'reviews', 'videos'] as const) {
        const rows = state.db[table] as { id?: string; yt_id?: string; created_at: string }[]
        for (const row of next[table] as typeof rows)
          if (row.created_at > before && !rows.some((r) => (r.id ?? r.yt_id) === (row.id ?? row.yt_id))) rows.push(row)
      }
    }
    setNow(moment)
    restart()
  },

  nextDay() {
    const d = new Date(state.at)
    const next = new Date(`${addDays(toISODate(d), 1)}T07:30:00`)
    this.moveTo(next)
  },

  setTime(hhmm: string) {
    const d = new Date(state.at)
    this.moveTo(new Date(`${toISODate(d)}T${hhmm}:00`))
  },

  reset() {
    this.open(state.scenario)
  },

  // For scripts (e.g. the coach simulation): add rows the way the coaching chat would
  insert(table: keyof Db, rows: Record<string, unknown>[]) {
    const stamp = new Date(state.at).toISOString()
    for (const row of rows)
      (state.db[table] as unknown[]).push({
        id: `coach-${Math.random().toString(36).slice(2, 10)}`,
        created_at: stamp,
        user_id: DEMO_USER,
        ...DEFAULTS[table],
        ...row,
      })
    restart()
  },

  hasVideoOn(date: string, ytId: string) {
    return state.db.plan_sessions.some((p) => p.date === date && p.video_ids.includes(ytId))
  },

  // From the Esercizi tab: the video becomes a session on that day, and the app opens on it
  addVideo(video: { yt_id: string; name: string; title: string; duration_s: number }, kind: string, date: string, slot: string) {
    const stamp = new Date(state.at).toISOString()
    if (!state.db.videos.some((v) => v.yt_id === video.yt_id))
      state.db.videos.push({
        yt_id: video.yt_id,
        title: video.title,
        duration_s: video.duration_s,
        flags: 'Scelto dal titolo: ancora da guardare',
        notes: null,
        available: true,
        playlists: [],
        tags: [],
        published_at: null,
        synced_at: null,
        views: null,
        created_at: stamp,
        user_id: DEMO_USER,
      })
    state.db.plan_sessions.push({
      id: `video-${video.yt_id}-${date}`,
      created_at: stamp,
      user_id: DEMO_USER,
      block: null,
      date,
      exercises: [],
      instructions: null,
      kind,
      position: 9,
      slot,
      title: video.name,
      video_ids: [video.yt_id],
    })
    restart()
  },

  at_: at, // exposed for scripts: at('2026-11-19', '07:40')
}

declare global {
  interface Window {
    gemeasDemo?: typeof demo
  }
}
window.gemeasDemo = demo
