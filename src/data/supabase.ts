// The real backend: the Supabase project, schema `gemeas`. Only this file and supabase-client.ts
// talk to Supabase; the demo build swaps it out (see src/data/backend.ts).
import type { Backend } from '@/data/api'
import { checkInRow, clearsOnStatus, FOOT, FOOT_TIMING, isPill, kindOf, walkRow } from '@/data/rules'
import { supabase } from '@/data/supabase-client'
import type { CheckIns, DayDot, DaySession, Video } from '@/data/types'
import { now } from '@/lib/clock'
import { addDays, appDay, DAY_STARTS_AT } from '@/lib/dates'

const ACTIVITY_COLUMNS = 'id, date, sport, source, duration_s, distance_m'
const PAGE = 1000 // Supabase returns at most this many rows per request

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
      if (isPill(s.kind)) continue
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
      if (clears.effort && log) check(await supabase.from('session_logs').update({ effort: null }).eq('id', log.id))
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

  // The chat with the coach needs its tables and server function first: until then
  // nobody has it, so the tab stays hidden in the real app
  async coachAvailable() {
    return false
  },

  async chatMessages() {
    return []
  },

  async sendChat() {
    throw new Error('Il coach non è ancora disponibile')
  },

  async removeWalk(id) {
    check(await supabase.from('activities').delete().eq('id', id))
  },
}
