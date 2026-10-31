// A made-up 12 weeks of Gemeas, in the shape of the real tables. Deterministic: the same
// seed always gives the same weeks. Nothing here is real data.
//
// The weeks (Monday dates), with the situations worth seeing:
//   W1  31 Aug  ordinary week: two lessons with the trainer, three workouts of her own, walks
//   W2   7 Sep  ordinary
//   W3  14 Sep  test day on Monday
//   W4  21 Sep  Thursday's lesson cancelled
//   W5  28 Sep  Tuesday's lesson moved to Wednesday
//   W6   5 Oct  sick week: almost everything skipped
//   W7  12 Oct  foot flare-up: Medio and Forte mornings, a hard lesson before it
//   W8  19 Oct  missed check-ins and late logging (yesterday fixed today)
//   W9  26 Oct  test day on Monday
//   W10  2 Nov  ordinary; holiday from Saturday
//   W11  9 Nov  holiday without the app: no plan, no logs
//   W12 16 Nov  back; a test on Thursday
import { addDays } from '@/lib/dates'
import type { Tables } from '@/lib/database.types'
import { DEMO_USER, emptyDb, type Db } from '@/demo/db'

export const FIRST_MONDAY = '2026-08-31'
export const WEEKS = 12

// --- small helpers -------------------------------------------------------------

// mulberry32: a tiny seeded random generator
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A local time on a date, as the ISO timestamp the database stores
export function at(date: string, hm: string) {
  return new Date(`${date}T${hm}:00`).toISOString()
}

const hm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(Math.max(0, Math.min(59, m))).padStart(2, '0')}`

// --- the plan the coach writes ------------------------------------------------

type Kind = 'trainer' | 'foot' | 'pill' | 'strength' | 'mobility' | 'test'

const TEMPLATE: Record<Kind, { title: string; instructions: string; exercises: string[]; video_ids: string[] }> = {
  trainer: {
    title: 'Lezione col trainer',
    instructions: 'Lezione online, pesi leggeri ed elastici. Digli come sta il piede.',
    exercises: [],
    video_ids: [],
  },
  foot: {
    title: 'Forza del piede',
    instructions: 'Sollevamenti lenti 3 × 12, poi tenute 3 × 30 s. Lieve va bene; fermati se supera Lieve.',
    exercises: ['ball_squeeze_heel_raise', 'sl_heel_hold_towel'],
    video_ids: ['CMD0zoHT1AI'],
  },
  pill: {
    title: 'Pillola per il piede',
    instructions: 'Tre minuti: sollevamenti lenti e una tenuta per lato.',
    exercises: [],
    video_ids: [],
  },
  strength: {
    title: 'Forza con elastici',
    instructions: 'Intensità media: la lezione col trainer è già stata impegnativa questa settimana.',
    exercises: [],
    video_ids: ['NFGlJXeJQ-U'],
  },
  mobility: {
    title: 'Mobilità',
    instructions: 'Tranquilla, solo per sciogliersi. Segui il video.',
    exercises: [],
    video_ids: ['CMD0zoHT1AI'],
  },
  test: {
    title: 'Test del piede',
    instructions: 'Sollevamenti su una gamba fino a fatica: prima la sinistra, poi la destra. Conta le ripetizioni pulite.',
    exercises: ['sl_heel_raise_test'],
    video_ids: [],
  },
}

// Per weekday (Mon = 0): the workouts, in the order they're listed
const WEEKLY: { kind: Kind; slot: 'am' | 'pm'; position: number; title?: string }[][] = [
  [{ kind: 'foot', slot: 'pm', position: 0 }],
  [
    { kind: 'pill', slot: 'pm', position: 0, title: 'Pillola prima della lezione' },
    { kind: 'trainer', slot: 'pm', position: 1 },
  ],
  [{ kind: 'mobility', slot: 'am', position: 0 }],
  [
    { kind: 'trainer', slot: 'pm', position: 0 },
    { kind: 'pill', slot: 'pm', position: 1, title: 'Pillola dopo la lezione' },
  ],
  [],
  [{ kind: 'strength', slot: 'am', position: 0 }],
  [],
]

const BLOCK_BY_WEEK = (w: number) => (w < 5 ? '2026-09 mese 1' : w < 10 ? '2026-10 mese 2' : '2026-11 mese 3')

// Public YouTube videos (titles as on YouTube); the notes and flags are the coach's
const VIDEOS: Omit<Tables<'videos'>, 'user_id' | 'created_at'>[] = [
  {
    yt_id: 'CMD0zoHT1AI',
    title: 'Stop Over-Pronation',
    duration_s: 660,
    flags: null,
    notes: 'Toe yoga, spinta dell’alluce su una gamba, tenute a tallone alzato.',
    available: true,
    playlists: [],
    tags: ['piede', 'caviglia', 'forza'],
    published_at: null,
    synced_at: null,
    views: null,
  },
  {
    yt_id: 'NFGlJXeJQ-U',
    title: 'Targeted Tibialis Strength',
    duration_s: 540,
    flags: 'Video di esempio: quelli scelti per l’app arriveranno più avanti',
    notes: 'Tibiale anteriore; utile l’ultimo esercizio.',
    available: true,
    playlists: [],
    tags: ['caviglia', 'forza'],
    published_at: null,
    synced_at: null,
    views: null,
  },
]

// What the coach wrote at each weekly check-in (week_start = the Monday it plans)
const REVIEWS: Record<number, { summary: string; decisions: string }> = {
  1: {
    summary: 'Prima settimana: due lezioni e tre allenamenti tuoi, quasi tutto fatto. Piede Lieve o Nessuno al mattino.',
    decisions: 'Stesso piano. Le lezioni restano martedì e giovedì; forza leggera sabato, così c’è un giorno di recupero.',
  },
  2: {
    summary: 'Buona settimana. La lezione di giovedì è stata dura, e sabato hai tenuto bene.',
    decisions: 'Lunedì un piccolo test del piede, per avere un punto di partenza. Il resto non cambia.',
  },
  3: {
    summary: 'Test: sinistra 18, destra 13 ripetizioni. Il destro è più debole, come ci aspettavamo. Due camminate in più.',
    decisions: 'Una pillola per il piede prima e dopo le lezioni. Lavoriamo un po’ di più sul destro.',
  },
  4: {
    summary: 'La lezione di giovedì è saltata: hai fatto una camminata lunga, ottima scelta.',
    decisions: 'Sabato forza un po’ più impegnativa, visto che la lezione è saltata. Settimana prossima torna normale.',
  },
  5: {
    summary: 'La lezione è passata da martedì a mercoledì: abbiamo spostato la mobilità. Piede tranquillo.',
    decisions: 'Nuovo blocco da lunedì: stessa struttura, pillole un po’ più lunghe.',
  },
  6: {
    summary: 'Settimana con l’influenza: quasi tutto saltato, ed era giusto così. Piede Nessuno per il riposo.',
    decisions: 'Si riparte piano. Prima lezione normale, ma sabato forza leggera e nessuna fretta.',
  },
  7: {
    summary: 'Piede Medio e poi Forte a metà settimana, dopo una lezione dura e una camminata lunga. Hai saltato il lavoro per il piede: ottima scelta.',
    decisions: 'Questa settimana esercizi per il piede più lenti, e meno range. Dillo al trainer prima della lezione.',
  },
  8: {
    summary: 'Il piede si è calmato: Lieve da martedì. Qualche check-in compilato il giorno dopo, va benissimo.',
    decisions: 'Lunedì nuovo test, per vedere come sta il destro.',
  },
  9: {
    summary: 'Test: sinistra 20, destra 16 ripetizioni. Il destro sale, da 13 di settembre. Due lezioni fatte e piede quasi sempre Nessuno.',
    decisions: 'Nuovo blocco da lunedì. Vacanza da sabato 7 novembre: niente piano finché non torni.',
  },
  10: {
    summary: 'Settimana normale prima della partenza. Lezioni fatte, piede tranquillo.',
    decisions: 'Goditi la vacanza: nessun piano. Cammina quanto vuoi. Si riparte lunedì 16.',
  },
  11: {
    summary: 'Bentornata. Dieci giorni senza l’app, tante camminate: va benissimo.',
    decisions: 'Si riparte con calma: giovedì un test del piede, e pillole brevi.',
  },
}

// --- one simulated life -------------------------------------------------------

const pick = <T>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)]
const between = (r: () => number, lo: number, hi: number) => Math.round(lo + r() * (hi - lo))

const COMMENTS: Partial<Record<Kind, string[]>> = {
  trainer: ['Tanti squat oggi, gambe stanche', 'Lezione tranquilla', 'Elastico nuovo, più duro'],
  foot: ['Destro instabile nell’ultima serie', 'Oggi sentivo più forza', 'Tirava un po’ alla fine, poi è passato'],
  strength: ['Fatta con calma', 'Elastico più duro sull’ultima serie'],
  mobility: ['Anche più sciolte dopo'],
}

export function buildWorld(seed = 7): Db {
  const r = rng(seed)
  const db = emptyDb()
  const id = (() => {
    let n = 0
    return (prefix: string) => `${prefix}-${String(++n).padStart(5, '0')}`
  })()

  const startStamp = at(addDays(FIRST_MONDAY, -2), '10:00')
  for (const v of VIDEOS) db.videos.push({ ...v, created_at: startStamp, user_id: DEMO_USER })

  // Situations by date
  const W = (w: number, dow: number) => addDays(FIRST_MONDAY, (w - 1) * 7 + dow)
  const sick = (d: string) => d >= W(6, 0) && d <= W(6, 4)
  const holiday = (d: string) => d >= W(10, 5) && d <= W(11, 6)
  const flare = (d: string) => d >= W(7, 3) && d <= W(8, 0)
  const lateWeek = (d: string) => d >= W(8, 0) && d <= W(8, 2)
  const cancelled = W(4, 3) // Thursday's lesson of week 4
  const movedFrom = W(5, 1) // Tuesday's lesson of week 5 moves to Wednesday...
  const movedTo = W(5, 2) // ...and that day's mobility moves to Tuesday

  // Tests replace the Monday's foot workout (or get added on the Thursday)
  const TESTS: Record<string, { L: number; R: number } | 'pending'> = {
    [W(3, 0)]: { L: 18, R: 13 },
    [W(9, 0)]: { L: 20, R: 16 },
    [W(12, 3)]: 'pending', // Thursday of week 12 (the demo's last "today")
  }

  // 1. The plan, week by week, written on the Sunday before at 18:00
  for (let w = 1; w <= WEEKS; w++) {
    const monday = W(w, 0)
    const written = at(addDays(monday, -1), '18:00')
    for (let dow = 0; dow < 7; dow++) {
      const planned = addDays(monday, dow)
      if (holiday(planned)) continue
      for (const item of WEEKLY[dow]) {
        const kind: Kind = TESTS[planned] && item.kind === 'foot' ? 'test' : item.kind
        const t = TEMPLATE[kind]
        // A moved lesson takes its pill along; the mobility swaps with it
        const date =
          planned === movedFrom && item.kind !== 'foot' ? movedTo : planned === movedTo && item.kind === 'mobility' ? movedFrom : planned
        db.plan_sessions.push({
          id: id('plan'),
          date,
          slot: item.slot,
          position: item.position,
          kind,
          title: kind === item.kind ? (item.title ?? t.title) : t.title,
          instructions: t.instructions,
          exercises: [...t.exercises],
          video_ids: [...t.video_ids],
          block: BLOCK_BY_WEEK(w - 1),
          created_at: written,
          user_id: DEMO_USER,
        })
      }
      if (TESTS[planned] && !WEEKLY[dow].some((x) => x.kind === 'foot')) {
        const t = TEMPLATE.test
        db.plan_sessions.push({
          id: id('plan'),
          date: planned,
          slot: 'am',
          position: 0,
          kind: 'test',
          title: t.title,
          instructions: t.instructions,
          exercises: [...t.exercises],
          video_ids: [],
          block: BLOCK_BY_WEEK(w - 1),
          created_at: written,
          user_id: DEMO_USER,
        })
      }
    }
  }

  // 2. Reviews (from week 2: the first check-in plans week 2)
  for (const [w, text] of Object.entries(REVIEWS)) {
    const monday = W(Number(w) + 1, 0)
    db.reviews.push({
      id: id('review'),
      week_start: monday,
      summary: text.summary,
      decisions: text.decisions,
      created_at: at(addDays(monday, -1), '18:00'),
      user_id: DEMO_USER,
    })
  }

  // 3. Each day: what she did, logged, felt
  let footBase = 2 // Lieve, slowly better
  const lastDay = W(WEEKS, 6)
  for (let date = FIRST_MONDAY; date <= lastDay; date = addDays(date, 1)) {
    const week = Math.floor((Date.parse(`${date}T12:00:00`) - Date.parse(`${FIRST_MONDAY}T12:00:00`)) / (7 * 86400000)) + 1
    const dow = (new Date(`${date}T12:00:00`).getDay() + 6) % 7
    const isDemoToday = week === WEEKS && dow >= 3
    if (week >= 9) footBase = 0

    // Walks: some from the watch, the others typed in by hand after the walk
    const walkChance = holiday(date) ? 0.3 : sick(date) ? 0 : 0.3
    if (!isDemoToday && r() < walkChance) {
      const minutes = between(r, 40, 60)
      const metres = between(r, 4000, 5000)
      // on holiday she walks but doesn't log them: only a few reach the app afterwards
      if (!holiday(date) || r() < 0.3)
        db.activities.push({
          id: id('walk'),
          date,
          sport: 'walk',
          source: dow % 2 ? 'garmin' : 'manual',
          duration_s: minutes * 60,
          distance_m: metres,
          created_at: holiday(date) ? at(W(12, 0), '08:00') : at(date, '18:30'),
          elevation_m: null,
          external_id: null,
          hr_avg: null,
          load: null,
          notes: null,
          plan_session_id: null,
          raw: null,
          user_id: DEMO_USER,
        })
    }

    // The day's sessions
    for (const p of db.plan_sessions.filter((x) => x.date === date)) {
      let status: 'done' | 'partial' | 'skipped' | null
      let pain: number | null = null
      if (sick(date)) status = r() < 0.85 ? 'skipped' : r() < 0.5 ? 'partial' : null
      else if (p.kind === 'trainer') status = date === cancelled ? 'skipped' : r() < 0.92 ? 'done' : 'partial'
      else if (p.kind === 'pill') {
        const x = r()
        status = x < 0.7 ? 'done' : null // a pill is done or left out
      } else if (p.kind === 'test') {
        status = TESTS[date] === 'pending' ? null : 'done'
        pain = 2
      } else {
        const x = r()
        status = flare(date) && p.kind === 'foot' ? 'skipped' : x < 0.78 ? 'done' : x < 0.86 ? 'partial' : x < 0.95 ? 'skipped' : null
        if (p.kind === 'foot') pain = r() < 0.6 ? 0 : 2
      }
      if (isDemoToday) status = null // the demo's "today" and after: not done yet
      if (!status) continue

      // When it was logged: right after, or (late-logging days) the next morning
      const late = lateWeek(date) && p.slot === 'pm' && dow === 1
      const loggedAt = late
        ? at(addDays(date, 1), hm(7, between(r, 45, 59)))
        : p.slot === 'am'
          ? at(date, hm(9, between(r, 5, 58)))
          : at(date, hm(19, between(r, 5, 59)))
      const comment =
        status !== 'skipped' && r() < 0.18
          ? pick(r, COMMENTS[p.kind as Kind] ?? ['']) || null
          : date === cancelled && p.kind === 'trainer'
            ? 'Lezione saltata, il trainer non poteva'
            : sick(date) && status === 'skipped' && r() < 0.4
              ? 'Influenza, a letto'
              : null
      const happened = status !== 'skipped'
      const hardWeek = week === 7 && dow === 1
      const effort =
        p.kind === 'trainer' && happened ? (hardWeek ? 'hard' : pick(r, ['light', 'medium', 'medium', 'medium', 'hard'])) : null
      const logId = id('log')
      db.session_logs.push({ id: logId, plan_session_id: p.id, status, effort, comment, logged_at: loggedAt, user_id: DEMO_USER })

      if (['foot', 'test'].includes(p.kind) && happened && pain != null && r() < 0.85)
        db.symptoms.push({
          id: id('sym'),
          session_log_id: logId,
          date,
          body_area: 'foot',
          side: 'R',
          timing: 'during',
          score: pain,
          context: null,
          created_at: loggedAt,
          user_id: DEMO_USER,
        })

      const result = TESTS[date]
      if (p.kind === 'test' && status === 'done' && result && result !== 'pending') {
        for (const side of ['L', 'R'] as const)
          db.tests.push({
            id: id('test'),
            plan_session_id: p.id,
            date,
            test: 'sl_heel_raise',
            side,
            value: result[side],
            unit: 'rip.',
            notes: null,
            created_at: loggedAt,
            user_id: DEMO_USER,
          })
      }
    }

    // Morning check-in: the right foot, first steps
    let foot = r() < 0.6 ? footBase : 0
    if (date === W(7, 3) || date === W(7, 5)) foot = 5
    if (date === W(7, 4)) foot = 8
    if (date === W(7, 6) || date === W(8, 0) || date === W(8, 1)) foot = 2
    if (sick(date)) foot = 0
    const missMorning = holiday(date) || lateWeek(date) || (sick(date) && r() < 0.4) || r() < 0.1
    if (!missMorning && !isDemoToday) db.symptoms.push(checkIn(id('sym'), date, foot, at(date, hm(7, between(r, 2, 30)))))

    // Weight, now and then
    if (!missMorning && !isDemoToday && r() < 0.2) {
      const kg = 62 + (r() - 0.5) * 1.2
      db.weights.push({ id: id('kg'), date, kg: Math.round(kg * 10) / 10, created_at: at(date, '07:10'), user_id: DEMO_USER })
    }
  }

  return db
}

function checkIn(id: string, date: string, score: number, created_at: string): Tables<'symptoms'> {
  return {
    id,
    date,
    body_area: 'foot',
    side: 'R',
    timing: 'next_morning',
    score,
    context: 'morning check-in',
    session_log_id: null,
    created_at,
    user_id: DEMO_USER,
  }
}

// What existed at a moment: every row written by then.
export function snapshot(world: Db, moment: Date): Db {
  const t = moment.toISOString()
  const db = emptyDb()
  db.plan_sessions = world.plan_sessions.filter((x) => x.created_at <= t)
  db.session_logs = world.session_logs.filter((x) => x.logged_at <= t)
  db.symptoms = world.symptoms.filter((x) => x.created_at <= t)
  db.activities = world.activities.filter((x) => x.created_at <= t)
  db.tests = world.tests.filter((x) => x.created_at <= t)
  db.weights = world.weights.filter((x) => x.created_at <= t)
  db.reviews = world.reviews.filter((x) => x.created_at <= t)
  db.videos = world.videos.filter((x) => x.created_at <= t)
  return structuredClone(db)
}
