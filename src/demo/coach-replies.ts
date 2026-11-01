// The demo's coach: a few answers already written, chosen by words in the message and
// filled in from the demo's made-up data. They follow the real coach's rules: pain in its
// word, a doctor when it stays high, no comment on weight, no changes to the plan.
import { FOOT, FOOT_TIMING } from '@/data/rules'
import type { Db } from '@/demo/db'
import { addDays } from '@/lib/dates'
import { duration, plural, relativeDay } from '@/lib/format'
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

export function scriptedReply(text: string, db: Db, today: string) {
  const said = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  if (/\b(male|dolor\w*|piede)\b/.test(said)) return foot(db, today)
  if (/\b(peso|kg|chili|dimagr\w*)\b/.test(said)) return 'Del peso qui non parlo. Se vuoi, parliamo di come ti senti o dell’allenamento.'
  if (/\b(spost\w*|cambi\w*|modific\w*|salt\w*|annull\w*)\b/.test(said))
    return 'Per ora da qui non posso cambiare il piano. Una seduta puoi spostarla tu, toccandola su Oggi. Per cambi più grandi, chiedi a chi gestisce l’app.'
  if (/\bcammin\w*\b/.test(said)) return walks(db, today)
  if (/\b(oggi|piano|programma|allenament\w*|faccio)\b/.test(said)) return plan(db, today)
  if (/\b(stanc\w*|energi\w*|sonno)\b/.test(said)) return 'Quando manca l’energia va bene fare meno: anche una seduta corta o una camminata contano. Saltare non è un problema.'
  if (/\b(ciao|salve|buongiorno|buonasera)\b/.test(said)) return 'Ciao! Puoi chiedermi del piano di oggi, del piede o delle camminate.'
  return 'Nella demo ho solo poche risposte già scritte: prova a chiedermi del piano di oggi, del piede o delle camminate. Il vero coach risponderà alla tua domanda, guardando i tuoi dati.'
}
