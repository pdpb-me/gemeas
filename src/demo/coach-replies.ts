// The demo's coach: a few answers already written, chosen by words in the message and
// filled in from the demo's made-up data. They follow the real coach's rules: pain in its
// word, a doctor when it stays high, no comment on weight, the plan changes only with Applica.
import { FOOT, FOOT_TIMING } from '@/data/rules'
import type { Db, DemoChange } from '@/demo/db'
import { addDays, mondayOf } from '@/lib/dates'
import { dayLabel, duration, plural, relativeDay } from '@/lib/format'
import { painBand, painLabel } from '@/lib/pain'

const SLOT: Record<string, string> = { am: 'Mattina', pm: 'Sera' }

function foot(db: Db, today: string) {
  const last = db.symptoms
    .filter((s) => s.date <= today && s.body_area === FOOT.body_area && s.timing === FOOT_TIMING && !s.session_log_id)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  if (!last) return 'Non vedo ancora risposte del mattino sul piede. Quando puoi, rispondi al check-in su Oggi: così posso seguire come va.'
  const lead = `L’ultima risposta del mattino (${relativeDay(last.date, today).toLowerCase()}) è ${painLabel(last.score)}.`
  return painBand(last.score) === 'low'
    ? `${lead} Va bene continuare con il piano. Guardiamo le settimane, più che i singoli giorni.`
    : `${lead} Terrei il carico leggero e mi fermerei se il dolore sale. Se resta a Medio o peggio, o peggiora, è meglio sentire un medico.`
}

function plan(db: Db, today: string) {
  const sessions = db.plan_sessions
    .filter((p) => p.date === today)
    .sort((a, b) => (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : a.position - b.position))
  if (!sessions.length) return 'Oggi non c’è niente nel piano. Se ti va, una camminata basta.'
  return `Ecco il piano di oggi:\n${sessions.map((p) => `${SLOT[p.slot] ?? p.slot}: ${p.title}`).join('\n')}`
}

function walks(db: Db, today: string) {
  const recent = db.activities.filter((a) => a.sport === 'walk' && a.date > addDays(today, -7) && a.date <= today)
  if (!recent.length) return 'Negli ultimi 7 giorni non vedo camminate. Nessun problema: riparti quando ti va.'
  const seconds = recent.reduce((sum, a) => sum + (a.duration_s ?? 0), 0)
  return `Negli ultimi 7 giorni vedo ${plural(recent.length, 'camminata', 'camminate')}, ${duration(seconds)} in tutto.`
}

// The next session she hasn't logged, one day later
function moveNext(db: Db, today: string) {
  const logged = new Set(db.session_logs.map((l) => l.plan_session_id))
  const next = db.plan_sessions
    .filter((p) => p.date >= today && p.kind !== 'pill' && !logged.has(p.id))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : a.position - b.position))[0]
  if (!next) return null
  const date = addDays(next.date, 1)
  const change: DemoChange = { op: 'move', session_id: next.id, before: { date: next.date, slot: next.slot }, after: { date, slot: next.slot } }
  return { summary: `Spostare «${next.title}» di un giorno`, lines: [`Sposta «${next.title}»: ${dayLabel(next.date)} → ${dayLabel(date)}`], changes: [change] }
}

function weekNote(today: string) {
  const week_start = addDays(mondayOf(today), 7)
  const decisions = 'Stesso piano, con calma. Se al mattino il piede è Medio, alleggerisci.'
  const change: DemoChange = { op: 'note', after: { week_start, decisions } }
  return { summary: 'La nota per la prossima settimana', lines: [`Nota della settimana del ${dayLabel(week_start)}: ${decisions}`], changes: [change] }
}

function intentOf(text: string) {
  const said = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  if (/\b(male|dolor\w*|piede)\b/.test(said)) return 'foot'
  if (/\b(peso|kg|chili|dimagr\w*)\b/.test(said)) return 'weight'
  if (/\b(punto|settimana|rivedi\w*|review)\b/.test(said)) return 'review'
  if (/\b(spost\w*|cambi\w*|modific\w*|salt\w*|annull\w*)\b/.test(said)) return 'move'
  if (/\bcammin\w*\b/.test(said)) return 'walks'
  if (/\b(oggi|piano|programma|allenament\w*|faccio)\b/.test(said)) return 'plan'
  if (/\b(stanc\w*|energi\w*|sonno)\b/.test(said)) return 'tired'
  if (/\b(ciao|salve|buongiorno|buonasera)\b/.test(said)) return 'hello'
  return null
}

// The card that goes with the answer, if any
export function scriptedProposal(text: string, db: Db, today: string) {
  const intent = intentOf(text)
  if (intent === 'move') return moveNext(db, today)
  if (intent === 'review') return weekNote(today)
  return null
}

export function scriptedReply(text: string, db: Db, today: string) {
  switch (intentOf(text)) {
    case 'foot':
      return foot(db, today)
    case 'weight':
      return 'Del peso qui non parlo. Se vuoi, parliamo di come ti senti o dell’allenamento.'
    case 'review':
      return 'Ecco la nota che ti propongo per la prossima settimana. Se ti va, tocca Applica.'
    case 'move':
      return moveNext(db, today)
        ? 'Ti propongo di spostarla di un giorno, così hai più respiro. Il piano cambia solo se tocchi Applica.'
        : 'Non vedo sedute da spostare nei prossimi giorni.'
    case 'walks':
      return walks(db, today)
    case 'plan':
      return plan(db, today)
    case 'tired':
      return 'Quando manca l’energia va bene fare meno: anche una seduta corta o una camminata contano. Saltare non è un problema.'
    case 'hello':
      return 'Ciao! Puoi chiedermi del piano di oggi, del piede, o di spostare una seduta.'
    default:
      return 'Nella demo ho solo poche risposte già scritte: prova a chiedermi del piano di oggi, del piede, o di spostare una seduta. Il vero coach risponderà alla tua domanda, guardando i tuoi dati.'
  }
}
