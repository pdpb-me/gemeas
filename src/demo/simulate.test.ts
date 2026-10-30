import { describe, expect, it } from 'vitest'
import { buildWorld, snapshot } from '@/demo/simulate'
import { SCENARIOS } from '@/demo/scenarios'

describe('the 12-week simulation', () => {
  const world = buildWorld()

  it('is the same every time (seeded)', () => {
    expect(JSON.stringify(buildWorld())).toBe(JSON.stringify(world))
  })

  it('has one log per session, and every log belongs to a planned session', () => {
    const ids = new Set(world.plan_sessions.map((p) => p.id))
    const logged = world.session_logs.map((l) => l.plan_session_id)
    expect(new Set(logged).size).toBe(logged.length)
    expect(logged.every((id) => ids.has(id))).toBe(true)
  })

  it('has one check-in answer per day', () => {
    const keys = world.symptoms.filter((s) => !s.session_log_id).map((s) => `${s.date}|${s.body_area}|${s.timing}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('stores pain as the app does (0, 2, 5, 8, 10)', () => {
    for (const s of world.symptoms) expect([0, 2, 5, 8, 10]).toContain(s.score)
  })

  it('asks how hard only for lessons that happened', () => {
    const kinds = new Map(world.plan_sessions.map((p) => [p.id, p.kind]))
    for (const l of world.session_logs) {
      if (l.effort) expect(kinds.get(l.plan_session_id)).toBe('trainer')
      if (l.status === 'skipped') expect(l.effort).toBeNull()
    }
  })

  it('shows nothing written after the moment of a snapshot', () => {
    const s = SCENARIOS.find((x) => x.id === 'late')!
    const db = snapshot(world, new Date(s.at))
    const t = new Date(s.at).toISOString()
    expect(db.session_logs.every((l) => l.logged_at <= t)).toBe(true)
    expect(db.plan_sessions.every((p) => p.created_at <= t)).toBe(true)
  })
})
