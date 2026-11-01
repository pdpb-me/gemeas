import { describe, expect, it } from 'vitest'
import type { ActivityRow, DoneSession } from '@/data/types'
import { historyOf } from '@/lib/history'

const watch = (date: string, sport: string): ActivityRow => ({ id: `w-${date}-${sport}`, date, sport, source: 'garmin', duration_s: 1800, distance_m: null })
const session = (date: string, kind: string, status = 'done'): DoneSession => ({ id: `s-${date}-${kind}`, date, kind, title: 'Seduta', status, minutes: null, exercises: [], videos: [] })

describe('the history of activities', () => {
  it('shows logged sessions when there is no watch, newest first', () => {
    const rows = historyOf([], [session('2026-11-02', 'trainer'), session('2026-11-03', 'cycle')])
    expect(rows.map((r) => r.sport)).toEqual(['cycle', 'trainer'])
    expect(rows[1]).toMatchObject({ title: 'Seduta', duration_s: 2700, estimated: true })
    expect(rows[0].duration_s).toBeNull() // how long she rode isn't known
  })

  it('shows a session the watch also recorded once, with the watch numbers', () => {
    const rows = historyOf([watch('2026-11-02', 'pilates'), watch('2026-11-01', 'running')], [session('2026-11-02', 'trainer'), session('2026-11-01', 'walk')])
    expect(rows.map((r) => r.id)).toEqual(['w-2026-11-02-pilates', 'w-2026-11-01-running'])
  })

  it('keeps a session the watch did not record, even with another sport that day', () => {
    const rows = historyOf([watch('2026-11-02', 'walk')], [session('2026-11-02', 'trainer')])
    expect(rows).toHaveLength(2)
  })

  it('one watch activity stands in for one session only', () => {
    const rows = historyOf([watch('2026-11-02', 'pilates')], [session('2026-11-02', 'foot'), session('2026-11-02', 'mobility')])
    expect(rows.map((r) => r.sport)).toEqual(['pilates', 'mobility'])
  })

  it('keeps a pill, and it never stands in for what the watch recorded', () => {
    const rows = historyOf([watch('2026-11-02', 'pilates')], [session('2026-11-02', 'pill'), session('2026-11-02', 'trainer')])
    expect(rows.map((r) => r.sport)).toEqual(['pilates', 'pill'])
  })

  it('gives no time for a session done in part, unless she wrote it', () => {
    const rows = historyOf([], [session('2026-11-03', 'trainer', 'partial')])
    expect(rows[0]).toMatchObject({ note: 'In parte', duration_s: null })
    const written = historyOf([], [{ ...session('2026-11-03', 'cycle', 'partial'), minutes: 20 }])
    expect(written[0]).toMatchObject({ duration_s: 1200, estimated: false })
  })

  it('prefers the minutes she wrote to the estimate', () => {
    const rows = historyOf([], [{ ...session('2026-11-03', 'trainer'), minutes: 50 }])
    expect(rows[0]).toMatchObject({ duration_s: 3000, estimated: false })
  })
})
