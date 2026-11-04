// Contract tests for the Backend: the rules both implementations must follow (see
// src/data/rules.ts and the migrations). They run on the demo's memory backend; the same
// tests can run against a local Supabase later (supabase start).
import { beforeEach, describe, expect, it } from 'vitest'
import type { Backend } from '@/data/api'
import { emptyDb, type Db } from '@/demo/db'
import { createMemoryBackend } from '@/demo/memory'
import { buildWorld, snapshot } from '@/demo/simulate'

let db: Db
let api: Backend
const plan = (id: string, kind: string, date = '2026-11-19', extra: Partial<Db['plan_sessions'][number]> = {}) =>
  db.plan_sessions.push({
    id,
    date,
    slot: 'pm',
    position: 0,
    kind,
    title: kind,
    instructions: null,
    exercises: kind === 'test' ? ['sl_heel_raise_test'] : [],
    video_ids: [],
    block: null,
    created_at: '2026-11-15T17:00:00Z',
    user_id: 'u',
    ...extra,
  })
const foot = { body_area: 'foot', side: 'R' }
const heel = { test: 'sl_heel_raise', unit: 'rip.' }

beforeEach(() => {
  db = emptyDb()
  api = createMemoryBackend(() => db)
  plan('lesson', 'trainer')
  plan('test', 'test')
  plan('foot', 'foot')
})

describe('session status', () => {
  it('skipped clears pain during, how hard and test results, and keeps the log and its note', async () => {
    await api.setStatus('test', 'done')
    await api.setEffort('test', 'hard')
    await api.setPain('test', foot, 2)
    await api.setTest('test', heel, 'L', 20)
    await api.setComment('test', 'prima la sinistra')
    await api.setStatus('test', 'skipped')
    expect(db.symptoms).toHaveLength(0)
    expect(db.tests).toHaveLength(0)
    expect(db.session_logs[0]).toMatchObject({ status: 'skipped', comment: 'prima la sinistra', effort: null })
  })

  it('clearing the log removes everything tied to it', async () => {
    await api.setStatus('foot', 'done')
    await api.setPain('foot', foot, 5)
    await api.setStatus('foot', null)
    expect(db.session_logs).toHaveLength(0)
    expect(db.symptoms).toHaveLength(0)
  })

  it('pain needs a log first', async () => {
    await expect(api.setPain('foot', foot, 2)).rejects.toThrow()
  })
})

describe('how hard a lesson was', () => {
  it('is saved on the log, corrected by a new tap, and refuses other words', async () => {
    await api.setStatus('lesson', 'done')
    await api.setEffort('lesson', 'medium')
    await api.setEffort('lesson', 'hard')
    expect(db.session_logs[0].effort).toBe('hard')
    await expect(api.setEffort('lesson', 'huge' as 'hard')).rejects.toThrow()
  })

  it('shows on the day', async () => {
    await api.setStatus('lesson', 'done')
    await api.setEffort('lesson', 'light')
    const day = await api.day('2026-11-19')
    expect(day.find((s) => s.id === 'lesson')!.log!.effort).toBe('light')
  })
})

describe('pills', () => {
  it('stay in the day and count in the week’s dots', async () => {
    plan('pill', 'pill')
    expect((await api.day('2026-11-19')).map((s) => s.id)).toContain('pill')
    const dots = await api.weekDots('2026-11-16', '2026-11-22')
    expect(dots['2026-11-19'].map((d) => d.id)).toContain('pill')
  })

  it('list in the order the coach set, before or after the lesson', async () => {
    plan('before', 'pill', '2026-11-20', { position: 0 })
    plan('main', 'trainer', '2026-11-20', { position: 1 })
    plan('after', 'pill', '2026-11-20', { position: 2 })
    expect((await api.day('2026-11-20')).map((s) => s.id)).toEqual(['before', 'main', 'after'])
  })
})

describe('moving a session', () => {
  it('takes pain and test results to the new date', async () => {
    await api.setStatus('test', 'done')
    await api.setPain('test', foot, 2)
    await api.setTest('test', heel, 'R', 12)
    await api.moveSession('test', '2026-11-21', 'am')
    expect(db.plan_sessions.find((p) => p.id === 'test')).toMatchObject({ date: '2026-11-21', slot: 'am' })
    expect(db.symptoms[0].date).toBe('2026-11-21')
    expect(db.tests[0].date).toBe('2026-11-21')
  })
})

describe('check-ins', () => {
  it('keep one answer per day; a new tap corrects it; null removes it', async () => {
    await api.saveCheckIn('2026-11-19', 2)
    await api.saveCheckIn('2026-11-19', 5)
    expect((await api.checkIns('2026-11-19')).foot).toBe(5)
    expect(db.symptoms).toHaveLength(1)
    expect(db.symptoms[0]).toMatchObject({ body_area: 'foot', side: 'R', timing: 'next_morning', context: 'morning check-in' })
    await api.saveCheckIn('2026-11-19', null)
    expect((await api.checkIns('2026-11-19')).foot).toBeNull()
  })

  it('refuse what the database refuses', async () => {
    await expect(api.saveCheckIn('2026-11-19', 11)).rejects.toThrow()
    await expect(api.saveWeight('2026-11-19', 12)).rejects.toThrow()
    await expect(api.moveSession('lesson', '2026-11-20', 'noon')).rejects.toThrow()
  })
})

describe('walks', () => {
  it('are saved in seconds and metres, and listed by date', async () => {
    await api.addWalk('2026-11-19', 50, 4.5)
    await api.addWalk('2026-11-19', 40, null)
    const rows = await api.activities('2026-11-19', '2026-11-19')
    expect(rows).toHaveLength(2)
    expect(db.activities[0]).toMatchObject({ sport: 'walk', source: 'manual', duration_s: 3000, distance_m: 4500, plan_session_id: null })
    expect(db.activities[1].distance_m).toBeNull()
    expect(await api.oldestActivityDate()).toBe('2026-11-19')
  })

  it('can be removed', async () => {
    await api.addWalk('2026-11-19', 50, 4.5)
    await api.removeWalk(db.activities[0].id)
    expect(db.activities).toHaveLength(0)
  })

  it('refuse impossible amounts', async () => {
    await expect(api.addWalk('2026-11-19', 0, null)).rejects.toThrow()
    await expect(api.addWalk('2026-11-19', 50, 500)).rejects.toThrow()
  })
})

describe('the simulated weeks', () => {
  it('pass the database limits', () => {
    const world = snapshot(buildWorld(), new Date('2026-11-23T00:00:00Z'))
    for (const s of world.symptoms) expect(s.score >= 0 && s.score <= 10).toBe(true)
    for (const w of world.weights) expect(w.kg >= 30 && w.kg <= 250).toBe(true)
    for (const p of world.plan_sessions) expect(['am', 'pm']).toContain(p.slot)
  })
})
