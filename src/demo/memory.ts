// The demo backend: the same reads and writes as src/data/supabase.ts, on an in-memory
// database (src/demo/db.ts). It follows the same rules (src/data/rules.ts) and checks
// the same limits as the database. No network.
import type { Backend } from '@/data/api'
import { check, checkInRow, clearsOnStatus, FOOT, FOOT_TIMING, kindOf, LIMITS, walkRow } from '@/data/rules'
import type { ActivityRow, CheckIns, DayDot, DaySession } from '@/data/types'
import { scriptedProposal, scriptedReply } from '@/demo/coach-replies'
import type { Db } from '@/demo/db'
import { DEMO_USER } from '@/demo/db'
import { now } from '@/lib/clock'
import { addDays, appDay, DAY_STARTS_AT } from '@/lib/dates'

const byDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
const byDate = (a: { date: string }, b: { date: string }) => -byDateDesc(a, b)
const bySlot = (a: { slot: string; position: number; created_at: string }, b: { slot: string; position: number; created_at: string }) =>
  a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : a.position - b.position || (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0)

let counter = 0
export function newId() {
  counter++
  return `demo-${Date.now().toString(36)}-${counter.toString(36)}`
}

const stamp = () => now().toISOString()

function activityOf(a: Db['activities'][number]): ActivityRow {
  const { id, date, sport, source, duration_s, distance_m } = a
  return { id, date, sport, source, duration_s, distance_m }
}

export function createMemoryBackend(db: () => Db, options: { latencyMs?: () => number; replyPauseMs?: number } = {}): Backend {
  // A pause like a real network's, so loading states can be seen (?latency=600)
  const wait = () => new Promise<void>((r) => setTimeout(r, options.latencyMs?.() ?? 0))

  const plan = (id: string) => {
    const p = db().plan_sessions.find((x) => x.id === id)
    if (!p) throw new Error('Questo allenamento non è più nel piano')
    return p
  }
  const logOf = (id: string) => db().session_logs.find((l) => l.plan_session_id === id)

  const backend: Backend = {
    auth: {
      signedIn: async () => true,
      onChange: () => () => {},
      sendCode: async () => {},
      verify: async () => {},
      signOut: async () => {},
    },

    async day(date) {
      await wait()
      const d = db()
      const sessions = d.plan_sessions.filter((p) => p.date === date).sort(bySlot)
      return sessions.map((p): DaySession => {
        const log = d.session_logs.find((l) => l.plan_session_id === p.id) ?? null
        return {
          ...structuredClone(p),
          kind: kindOf(p.kind),
          log: log && { ...log, symptoms: d.symptoms.filter((s) => s.session_log_id === log.id) },
          tests: d.tests.filter((t) => t.plan_session_id === p.id),
          videos: p.video_ids.flatMap((id) => d.videos.filter((v) => v.yt_id === id)),
        }
      })
    },

    async weekDots(from, to) {
      await wait()
      const d = db()
      const byDay: Record<string, DayDot[]> = {}
      for (const p of d.plan_sessions.filter((x) => x.date >= from && x.date <= to).sort(bySlot)) {
        ;(byDay[p.date] ??= []).push({ id: p.id, slot: p.slot, kind: kindOf(p.kind), status: logOf(p.id)?.status ?? null })
      }
      return byDay
    },

    async checkIns(date) {
      await wait()
      const d = db()
      const w = d.weights.find((x) => x.date === date)
      const result: CheckIns = {
        foot: d.symptoms.find((s) => s.date === date && s.body_area === FOOT.body_area && s.timing === FOOT_TIMING && !s.session_log_id)?.score ?? null,
        weight: w ? Number(w.kg) : null,
      }
      return result
    },

    async lastLog(before) {
      await wait()
      const d = db()
      const start = new Date(`${before}T${String(DAY_STARTS_AT).padStart(2, '0')}:00:00`).toISOString()
      const latest = [...d.session_logs.map((l) => l.logged_at), ...d.symptoms.filter((s) => !s.session_log_id).map((s) => s.created_at)]
        .filter((t) => t < start)
        .sort()
        .pop()
      return latest ? { date: appDay(new Date(latest)) } : null
    },

    async progress(today) {
      await wait()
      const d = db()
      const yearAgo = addDays(today, -364)
      return {
        today,
        symptoms: d.symptoms
          .filter((s) => !s.session_log_id && s.timing === FOOT_TIMING && s.date >= yearAgo && s.date <= today)
          .sort(byDate)
          .map(({ date, body_area, timing, score }) => ({ date, body_area, timing, score })),
        walks: d.activities.filter((a) => a.sport === 'walk' && a.date >= addDays(today, -182) && a.date <= today).map(({ date }) => ({ date })),
        tests: d.tests
          .filter((t) => t.date <= today)
          .sort(byDate)
          .map(({ date, test, side, value, unit }) => ({ date, test, side, value, unit })),
        weights: d.weights
          .filter((w) => w.date >= yearAgo && w.date <= today)
          .sort(byDate)
          .map((w) => ({ date: w.date, kg: Number(w.kg) })),
      }
    },

    async nextTest(today) {
      await wait()
      const next = db()
        .plan_sessions.filter((p) => p.exercises.includes('sl_heel_raise_test') && p.date >= today)
        .sort(byDate)[0]
      return next ? { date: next.date } : null
    },

    async testResults(test) {
      await wait()
      return db()
        .tests.filter((t) => t.test === test)
        .sort(byDate)
        .map(({ date, side, value, plan_session_id }) => ({ date, side, value, plan_session_id }))
    },

    async activities(from, to) {
      await wait()
      return db()
        .activities.filter((a) => a.date >= from && a.date <= to)
        .sort((a, b) => byDateDesc(a, b) || (a.created_at < b.created_at ? 1 : -1))
        .map(activityOf)
    },

    async oldestActivityDate() {
      await wait()
      return [...db().activities].sort(byDate)[0]?.date ?? null
    },

    async doneSessions(from, to) {
      await wait()
      const d = db()
      return d.plan_sessions
        .filter((p) => p.date >= from && p.date <= to && logOf(p.id) && logOf(p.id)!.status !== 'skipped')
        .sort((a, b) => byDateDesc(a, b) || bySlot(b, a))
        .map((p) => ({
          id: p.id,
          date: p.date,
          kind: kindOf(p.kind),
          title: p.title,
          exercises: [...p.exercises],
          status: logOf(p.id)!.status,
          minutes: logOf(p.id)!.minutes,
          videos: p.video_ids.flatMap((id) => d.videos.filter((v) => v.yt_id === id)),
        }))
    },

    async oldestDoneSessionDate() {
      await wait()
      const done = db().plan_sessions.filter((p) => logOf(p.id) && logOf(p.id)!.status !== 'skipped')
      return [...done].sort(byDate)[0]?.date ?? null
    },

    async review(weekStart) {
      await wait()
      const r = db()
        .reviews.filter((x) => x.week_start <= weekStart)
        .sort((a, b) => (a.week_start < b.week_start ? 1 : a.week_start > b.week_start ? -1 : a.created_at < b.created_at ? 1 : -1))[0]
      return r ? { id: r.id, week_start: r.week_start, summary: r.summary, decisions: r.decisions, created_at: r.created_at } : null
    },

    async coachAvailable() {
      return true
    },

    async tracksFoot() {
      return true
    },

    async chatMessages() {
      await wait()
      return structuredClone(db().chat_messages)
    },

    async sendChat(text, onReply) {
      await wait()
      check(LIMITS.chat(text), 'messaggio')
      const d = db()
      d.chat_messages.push({ id: newId(), role: 'user', text: text.trim(), created_at: stamp() })
      const today = appDay(now())
      const reply = scriptedReply(text, d, today)
      const proposal = scriptedProposal(text, d, today)
      if (proposal) {
        for (const p of d.chat_proposals) if (p.status === 'pending') p.status = 'replaced'
        d.chat_proposals.push({ ...proposal, id: newId(), status: 'pending', created_at: stamp() })
      }
      // a piece at a time, like the real coach's reply
      const words = reply.split(/(?<=\s)/)
      for (let i = 1; i <= words.length; i++) {
        if (options.replyPauseMs) await new Promise((r) => setTimeout(r, options.replyPauseMs))
        onReply(words.slice(0, i).join(''))
      }
      db().chat_messages.push({ id: newId(), role: 'coach', text: reply, created_at: stamp() })
    },

    async chatProposals() {
      await wait()
      return db().chat_proposals.map(({ id, summary, lines, status, created_at }) => ({ id, summary, lines: [...lines], status, created_at }))
    },

    // Like gemeas.decide_proposal: all or nothing, and only if nothing changed in the meantime
    async decideProposal(id, apply) {
      await wait()
      const d = db()
      const proposal = d.chat_proposals.find((p) => p.id === id)
      if (!proposal) throw new Error('Proposta non trovata')
      if (proposal.status !== 'pending') return
      if (!apply) {
        proposal.status = 'declined'
        return
      }
      for (const c of proposal.changes) {
        if (c.op !== 'move') continue
        const session = d.plan_sessions.find((p) => p.id === c.session_id)
        // she logged it after the coach proposed: the coach didn't know (same check as the SQL)
        const loggedSince = d.session_logs.some((l) => l.plan_session_id === c.session_id && l.logged_at >= proposal.created_at)
        if (!session || session.date !== c.before.date || session.slot !== c.before.slot || loggedSince) {
          proposal.status = 'stale'
          return
        }
      }
      for (const c of proposal.changes) {
        if (c.op === 'move') {
          await backend.moveSession(c.session_id, c.after.date, c.after.slot)
        } else {
          const note = d.reviews.find((r) => r.week_start === c.after.week_start)
          if (note) note.decisions = c.after.decisions
          else d.reviews.push({ id: newId(), week_start: c.after.week_start, summary: null, decisions: c.after.decisions, created_at: stamp(), user_id: DEMO_USER })
        }
      }
      proposal.status = 'applied'
    },

    async setStatus(id, status) {
      await wait()
      if (status) check(LIMITS.status(status), 'stato')
      plan(id)
      const d = db()
      const clears = clearsOnStatus(status)
      let log = logOf(id)
      if (status) {
        if (log) Object.assign(log, { status, logged_at: stamp() })
        else {
          log = { id: newId(), plan_session_id: id, status, effort: null, minutes: null, comment: null, logged_at: stamp(), user_id: DEMO_USER }
          d.session_logs.push(log)
        }
        const logId = log.id
        if (clears.pain) d.symptoms = d.symptoms.filter((s) => !(s.session_log_id === logId && s.timing === 'during'))
        if (clears.effort) Object.assign(log, { effort: null, minutes: null })
      } else if (log) {
        const logId = log.id
        d.session_logs = d.session_logs.filter((l) => l.id !== logId)
        d.symptoms = d.symptoms.filter((s) => s.session_log_id !== logId) // on delete cascade
      }
      if (clears.tests) d.tests = d.tests.filter((t) => t.plan_session_id !== id)
    },

    async setEffort(id, effort) {
      await wait()
      if (effort) check(LIMITS.effort(effort), 'fatica')
      const log = logOf(id)
      if (log) log.effort = effort
    },

    async setPain(id, area, score) {
      await wait()
      if (score != null) check(LIMITS.score(score), 'dolore')
      const d = db()
      const p = plan(id)
      const log = logOf(id)
      if (!log) throw new Error('Registra prima l’allenamento')
      const existing = d.symptoms.find((s) => s.session_log_id === log.id && s.body_area === area.body_area && s.timing === 'during')
      if (score == null) d.symptoms = d.symptoms.filter((s) => s !== existing)
      else if (existing) existing.score = score
      else
        d.symptoms.push({
          id: newId(),
          session_log_id: log.id,
          date: p.date,
          body_area: area.body_area,
          side: area.side,
          timing: 'during',
          score,
          context: null,
          created_at: stamp(),
          user_id: DEMO_USER,
        })
    },

    async setMinutes(id, minutes) {
      await wait()
      if (minutes != null) check(LIMITS.minutes(minutes), 'minuti')
      const log = logOf(id)
      if (log) log.minutes = minutes
    },

    async setComment(id, comment) {
      await wait()
      const log = logOf(id)
      if (log) log.comment = comment
    },

    async setTest(id, spec, side, value) {
      await wait()
      const d = db()
      const existing = d.tests.find((t) => t.plan_session_id === id && t.test === spec.test && t.side === side)
      if (value == null) {
        d.tests = d.tests.filter((t) => t !== existing)
        return
      }
      const p = plan(id)
      if (existing) existing.value = value
      else
        d.tests.push({
          id: newId(),
          plan_session_id: id,
          date: p.date,
          test: spec.test,
          side,
          value,
          unit: spec.unit,
          notes: null,
          created_at: stamp(),
          user_id: DEMO_USER,
        })
    },

    async moveSession(id, date, slot) {
      await wait()
      check(LIMITS.slot(slot), 'momento della giornata')
      const d = db()
      const p = d.plan_sessions.find((x) => x.id === id)
      if (!p) return // like an update that matches no row
      Object.assign(p, { date, slot })
      const log = logOf(id)
      for (const s of d.symptoms) if (log && s.session_log_id === log.id) s.date = date
      for (const t of d.tests) if (t.plan_session_id === id) t.date = date
    },

    async saveCheckIn(date, score) {
      await wait()
      if (score != null) check(LIMITS.score(score), 'dolore')
      const d = db()
      const match = (s: Db['symptoms'][number]) => s.date === date && s.body_area === FOOT.body_area && s.timing === FOOT_TIMING && !s.session_log_id
      if (score == null) {
        d.symptoms = d.symptoms.filter((s) => !match(s))
        return
      }
      const existing = d.symptoms.find(match)
      if (existing) existing.score = score
      else d.symptoms.push({ ...checkInRow(date, score), id: newId(), session_log_id: null, created_at: stamp(), user_id: DEMO_USER })
    },

    async saveWeight(date, kg) {
      await wait()
      if (kg != null) check(LIMITS.kg(kg), 'peso')
      const d = db()
      const existing = d.weights.find((w) => w.date === date)
      if (kg == null) d.weights = d.weights.filter((w) => w !== existing)
      else if (existing) existing.kg = kg
      else d.weights.push({ id: newId(), date, kg, created_at: stamp(), user_id: DEMO_USER })
    },

    async addWalk(date, minutes, km) {
      await wait()
      check(LIMITS.minutes(minutes), 'minuti')
      if (km != null) check(LIMITS.km(km), 'km')
      db().activities.push({
        ...walkRow(date, minutes, km),
        id: newId(),
        created_at: stamp(),
        elevation_m: null,
        external_id: null,
        hr_avg: null,
        load: null,
        notes: null,
        plan_session_id: null,
        raw: null,
        user_id: DEMO_USER,
      })
    },

    async removeWalk(id) {
      await wait()
      const d = db()
      d.activities = d.activities.filter((a) => a.id !== id)
    },

    // The demo has no watch: its made-up activities are already there
    async syncWatch() {},
  }
  return backend
}
