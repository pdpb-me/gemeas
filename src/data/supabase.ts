// The real backend: the Supabase project, schema `gemeas`. Only this file and supabase-client.ts
// talk to Supabase; the demo build swaps it out (see src/data/backend.ts).
import type { Backend } from '@/data/api'
import { checkInRow, clearsOnStatus, FOOT, FOOT_TIMING, kindOf, walkRow } from '@/data/rules'
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/data/supabase-client'
import type { ChatMessage, CheckIns, DayDot, DaySession, Video } from '@/data/types'
import { now } from '@/lib/clock'
import { addDays, appDay, DAY_STARTS_AT } from '@/lib/dates'

const ACTIVITY_COLUMNS = 'id, date, sport, source, duration_s, distance_m'
const PAGE = 1000 // Supabase returns at most this many rows per request
const CHAT_SHOWN = 200 // the chat shows the latest messages
const COACH_DOWN = 'Il coach non risponde adesso. Riprova tra poco.'
const REPLY_CHECKS = 20
const REPLY_CHECK_MS = 3000

type Result<T> = { data: T | null; error: { message: string; code?: string } | null }

// Throws the error's message, so callers can show it. Lists come back as [] rather than null.
function check<T>(res: Result<T[]>): T[]
function check<T>(res: Result<T>): T | null
function check<T>(res: Result<T>) {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

// Every row of a long list, a page at a time (a year of check-ins can pass 1000 rows)
async function all<T>(page: (from: number, to: number) => PromiseLike<Result<T[]>>) {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const batch = check(await page(from, from + PAGE - 1))
    rows.push(...batch)
    if (batch.length < PAGE) return rows
  }
}

async function chatMessages(): Promise<ChatMessage[]> {
  const rows = check(await supabase.from('chat_messages').select('id, role, text, created_at').not('text', 'is', null).order('seq', { ascending: false }).limit(CHAT_SHOWN))
  return rows.reverse().map((m) => ({ id: m.id, role: m.role === 'user' ? 'user' : 'coach', text: m.text ?? '', created_at: m.created_at }))
}

// The connection dropped (on an iPhone, leaving the app is enough): the server goes on by
// itself, so look for its reply. A failed message isn't saved, and none comes back.
async function waitForReply(after: string | undefined) {
  for (let i = 0; i < REPLY_CHECKS; i++) {
    await new Promise((r) => setTimeout(r, REPLY_CHECK_MS))
    const last = await chatMessages().then((m) => m.at(-1), () => undefined)
    if (last && last.id !== after && last.role === 'coach') return
  }
  throw new Error(COACH_DOWN)
}

async function planSession(id: string) {
  const p = check(await supabase.from('plan_sessions').select('id, date, kind').eq('id', id).maybeSingle())
  if (!p) throw new Error('Questo allenamento non è più nel piano')
  return p
}

async function logId(planSessionId: string) {
  const log = check(await supabase.from('session_logs').select('id').eq('plan_session_id', planSessionId).maybeSingle())
  return log?.id ?? null
}

export const backend: Backend = {
  auth: {
    async signedIn() {
      const { data } = await supabase.auth.getSession()
      return data.session != null
    },
    onChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, s) => listener(s != null))
      return () => data.subscription.unsubscribe()
    },
    async sendCode(email) {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw new Error(error.message)
    },
    async verify(email, token) {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
      if (error) throw new Error(error.message)
    },
    async signOut() {
      await supabase.auth.signOut()
    },
  },

  async day(date) {
    const data = check(
      await supabase
        .from('plan_sessions')
        .select('*, session_logs(*, symptoms(*)), tests(*)')
        .eq('date', date)
        .order('slot')
        .order('position')
        .order('created_at'),
    )
    const ids = [...new Set(data.flatMap((s) => s.video_ids))]
    const videos = ids.length
      ? check(await supabase.from('videos').select('*').in('yt_id', ids))
      : ([] as Video[])
    return data.map(
      ({ session_logs, tests, ...s }): DaySession => ({
        ...s,
        kind: kindOf(s.kind),
        log: session_logs,
        tests,
        // keep the order the plan lists them in
        videos: s.video_ids.flatMap((id) => videos.filter((v) => v.yt_id === id)),
      }),
    )
  },

  async weekDots(from, to) {
    const data = check(
      await supabase
        .from('plan_sessions')
        .select('id, date, slot, kind, session_logs(status)')
        .gte('date', from)
        .lte('date', to)
        .order('slot')
        .order('position')
        .order('created_at'),
    )
    const byDay: Record<string, DayDot[]> = {}
    for (const s of data) {
      ;(byDay[s.date] ??= []).push({ id: s.id, slot: s.slot, kind: kindOf(s.kind), status: s.session_logs?.status ?? null })
    }
    return byDay
  },

  async checkIns(date) {
    const [answers, kg] = await Promise.all([
      supabase
        .from('symptoms')
        .select('score')
        .eq('date', date)
        .eq('body_area', FOOT.body_area)
        .eq('timing', FOOT_TIMING)
        .is('session_log_id', null)
        .limit(1)
        .then((r) => check(r)),
      supabase
        .from('weights')
        .select('kg')
        .eq('date', date)
        .maybeSingle()
        .then((r) => check(r)),
    ])
    const result: CheckIns = {
      foot: answers[0]?.score ?? null,
      weight: kg ? Number(kg.kg) : null,
    }
    return result
  },

  async lastLog(before) {
    const start = new Date(`${before}T${String(DAY_STARTS_AT).padStart(2, '0')}:00:00`).toISOString()
    const [log, answer] = await Promise.all([
      supabase
        .from('session_logs')
        .select('logged_at')
        .lt('logged_at', start)
        .order('logged_at', { ascending: false })
        .limit(1)
        .then((r) => check(r)),
      supabase
        .from('symptoms')
        .select('created_at')
        .is('session_log_id', null)
        .lt('created_at', start)
        .order('created_at', { ascending: false })
        .limit(1)
        .then((r) => check(r)),
    ])
    const latest = [log[0]?.logged_at, answer[0]?.created_at]
      .filter((x): x is string => !!x)
      .sort()
      .pop()
    return latest ? { date: appDay(new Date(latest)) } : null
  },

  async progress(today) {
    const yearAgo = addDays(today, -364)
    const [symptoms, walks, tests, weights] = await Promise.all([
      // only the check-ins (one a day), in pages: trends need a whole year
      all((from, to) =>
        supabase
          .from('symptoms')
          .select('date, body_area, timing, score')
          .is('session_log_id', null)
          .eq('timing', FOOT_TIMING)
          .gte('date', yearAgo)
          .lte('date', today)
          .order('date')
          .order('id')
          .range(from, to),
      ),
      supabase
        .from('activities')
        .select('date')
        .eq('sport', 'walk')
        .gte('date', addDays(today, -182))
        .lte('date', today)
        .then((r) => check(r)),
      supabase
        .from('tests')
        .select('date, test, side, value, unit')
        .lte('date', today)
        .order('date')
        .then((r) => check(r)),
      supabase
        .from('weights')
        .select('date, kg')
        .gte('date', yearAgo)
        .lte('date', today)
        .order('date')
        .then((r) => check(r)),
    ])
    return {
      today,
      symptoms,
      walks,
      tests,
      weights: weights.map((w) => ({ date: w.date, kg: Number(w.kg) })),
    }
  },

  async nextTest(today) {
    const data = check(
      await supabase
        .from('plan_sessions')
        .select('date')
        .contains('exercises', ['sl_heel_raise_test'])
        .gte('date', today)
        .order('date')
        .limit(1),
    )
    return data[0] ?? null
  },

  async testResults(test) {
    return check(await supabase.from('tests').select('date, side, value, plan_session_id').eq('test', test).order('date'))
  },

  async activities(from, to) {
    return check(
      await supabase
        .from('activities')
        .select(ACTIVITY_COLUMNS)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
    )
  },

  async oldestActivityDate() {
    const data = check(await supabase.from('activities').select('date').order('date').limit(1))
    return data[0]?.date ?? null
  },

  async doneSessions(from, to) {
    const rows = check(
      await supabase
        .from('plan_sessions')
        .select('id, date, kind, title, exercises, video_ids, session_logs!inner(status, minutes)')
        .gte('date', from)
        .lte('date', to)
        .neq('session_logs.status', 'skipped')
        .order('date', { ascending: false })
        .order('slot', { ascending: false })
        .order('position', { ascending: false }),
    )
    const ids = [...new Set(rows.flatMap((s) => s.video_ids))]
    const videos = ids.length ? check(await supabase.from('videos').select('yt_id, duration_s').in('yt_id', ids)) : []
    return rows.map((s) => ({
      id: s.id,
      date: s.date,
      kind: kindOf(s.kind),
      title: s.title,
      exercises: s.exercises,
      status: s.session_logs.status,
      minutes: s.session_logs.minutes,
      videos: s.video_ids.flatMap((id) => videos.filter((v) => v.yt_id === id)),
    }))
  },

  async oldestDoneSessionDate() {
    const data = check(await supabase.from('plan_sessions').select('date, session_logs!inner(status)').neq('session_logs.status', 'skipped').order('date').limit(1))
    return data[0]?.date ?? null
  },

  async review(weekStart) {
    const data = check(
      await supabase
        .from('reviews')
        .select('id, week_start, summary, decisions, created_at')
        .lte('week_start', weekStart)
        .order('week_start', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1),
    )
    return data[0] ?? null
  },

  // The status of one session. Skipped (or cleared) removes pain during, "how hard" and test results.
  async setStatus(id, status) {
    const clears = clearsOnStatus(status)
    if (status) {
      const log = check(
        await supabase
          .from('session_logs')
          .upsert({ plan_session_id: id, status, logged_at: now().toISOString() }, { onConflict: 'plan_session_id' })
          .select('id')
          .single(),
      )
      if (clears.pain && log) check(await supabase.from('symptoms').delete().eq('session_log_id', log.id).eq('timing', 'during'))
      if (clears.effort && log) check(await supabase.from('session_logs').update({ effort: null, minutes: null }).eq('id', log.id))
    } else {
      check(await supabase.from('session_logs').delete().eq('plan_session_id', id)) // pain goes with it (cascade)
    }
    if (clears.tests) check(await supabase.from('tests').delete().eq('plan_session_id', id))
  },

  async setEffort(id, effort) {
    check(await supabase.from('session_logs').update({ effort }).eq('plan_session_id', id))
  },

  // Pain during a session (one score per body area). null clears it.
  async setPain(id, area, score) {
    const [plan, log] = await Promise.all([planSession(id), logId(id)])
    if (!log) throw new Error('Registra prima l’allenamento')
    if (score == null) {
      check(await supabase.from('symptoms').delete().eq('session_log_id', log).eq('body_area', area.body_area).eq('timing', 'during'))
      return
    }
    check(
      await supabase
        .from('symptoms')
        .upsert(
          { session_log_id: log, date: plan.date, body_area: area.body_area, side: area.side, timing: 'during', score },
          { onConflict: 'session_log_id,body_area,timing' },
        ),
    )
  },

  async setMinutes(id, minutes) {
    check(await supabase.from('session_logs').update({ minutes }).eq('plan_session_id', id))
  },

  async setComment(id, comment) {
    check(await supabase.from('session_logs').update({ comment }).eq('plan_session_id', id))
  },

  // One test result per side (e.g. heel-raise reps). null clears it.
  async setTest(id, spec, side, value) {
    if (value == null) {
      check(await supabase.from('tests').delete().eq('plan_session_id', id).eq('test', spec.test).eq('side', side))
      return
    }
    const plan = await planSession(id)
    check(
      await supabase
        .from('tests')
        .upsert(
          { plan_session_id: id, date: plan.date, test: spec.test, side, value, unit: spec.unit },
          { onConflict: 'plan_session_id,test,side' },
        ),
    )
  },

  // Move a session to another day (and/or slot). Anything logged for it moves too.
  async moveSession(id, date, slot) {
    check(await supabase.from('plan_sessions').update({ date, slot }).eq('id', id))
    const log = await logId(id)
    await Promise.all([
      log &&
        supabase
          .from('symptoms')
          .update({ date })
          .eq('session_log_id', log)
          .then((r) => check(r)),
      supabase
        .from('tests')
        .update({ date })
        .eq('plan_session_id', id)
        .then((r) => check(r)),
    ])
  },

  // One answer per day. (Writes run one at a time, see store.ts, so reading first can't
  // race with another tap.)
  async saveCheckIn(date, score) {
    const match = () =>
      supabase
        .from('symptoms')
        .select('id')
        .eq('date', date)
        .eq('body_area', FOOT.body_area)
        .eq('timing', FOOT_TIMING)
        .is('session_log_id', null)
    if (score == null) {
      const rows = check(await match())
      if (rows.length)
        check(
          await supabase
            .from('symptoms')
            .delete()
            .in(
              'id',
              rows.map((r) => r.id),
            ),
        )
      return
    }
    const existing = check(await match().limit(1))[0]
    if (existing) check(await supabase.from('symptoms').update({ score }).eq('id', existing.id))
    else check(await supabase.from('symptoms').insert(checkInRow(date, score)))
  },

  // One weight per day, so a new value corrects it; null removes it
  async saveWeight(date, kg) {
    if (kg == null) check(await supabase.from('weights').delete().eq('date', date))
    else check(await supabase.from('weights').upsert({ date, kg }, { onConflict: 'user_id,date' }))
  },

  async addWalk(date, minutes, km) {
    check(await supabase.from('activities').insert(walkRow(date, minutes, km)))
  },

  async syncWatch() {
    const { error } = await supabase.functions.invoke('gemeas-garmin-sync', { method: 'POST' })
    if (error) throw new Error(error.message)
  },

  async coachAvailable() {
    const profile = check(await supabase.from('coach_profiles').select('enabled').maybeSingle())
    return profile?.enabled === true
  },

  async tracksFoot() {
    const profile = check(await supabase.from('coach_profiles').select('tracks_foot').maybeSingle())
    return profile?.tracks_foot === true
  },

  chatMessages,

  async chatProposals() {
    const rows = check(await supabase.from('plan_proposals').select('id, summary, lines, status, created_at').order('created_at', { ascending: false }).limit(CHAT_SHOWN))
    return rows.reverse()
  },

  async decideProposal(id, apply) {
    check(await supabase.rpc('decide_proposal', { p_id: id, p_apply: apply }))
  },

  // The server sends the reply as lines of JSON: { d: more text }, { reset: true } to start
  // the text again, { done: true } at the end, or { error: what to tell her }
  async sendChat(text, onReply) {
    let before: string | undefined
    let res: Response
    try {
      const { data } = await supabase.auth.getSession()
      before = (await chatMessages()).at(-1)?.id
      res = await fetch(`${SUPABASE_URL}/functions/v1/gemeas-coach-chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session?.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
    } catch {
      throw new Error(COACH_DOWN)
    }
    if (!res.ok || !res.body) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? COACH_DOWN)
    }

    let reply = ''
    let pieces = ''
    let finished = false
    const decoder = new TextDecoder()
    const reader = res.body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        pieces += decoder.decode(value, { stream: true })
        const lines = pieces.split('\n')
        pieces = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const message = JSON.parse(line) as { d?: string; reset?: boolean; done?: boolean; error?: string }
          if (message.error) throw new Error(message.error)
          if (message.done) finished = true
          if (message.reset) reply = ''
          if (message.d) {
            reply += message.d
            onReply(reply)
          }
        }
      }
    } catch (e) {
      if (e instanceof SyntaxError) throw new Error(COACH_DOWN) // never a technical message in the chat
      if (!(e instanceof TypeError)) throw e // a TypeError is the connection dropping
    }
    if (!finished) await waitForReply(before)
  },

  async removeWalk(id) {
    check(await supabase.from('activities').delete().eq('id', id))
  },
}
