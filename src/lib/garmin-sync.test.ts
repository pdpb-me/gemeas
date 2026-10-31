import { describe, expect, it } from 'vitest'
import { duplicateManualWalks, lastDays, toRows } from '../../supabase/functions/_shared/garmin.ts'

const walk = {
  activityId: 123,
  startTimeLocal: '2026-10-31 08:15:00',
  activityType: { typeKey: 'walking' },
  duration: 2400.4,
  distance: 3999.6,
  averageHR: 101.2,
  elevationGain: 12.5,
  ownerFullName: 'Nome di prova',
  startLatitude: 1,
  startLongitude: 2,
}

describe('toRows', () => {
  it('keeps only the columns the app needs', () => {
    expect(toRows([walk], 'u1')).toEqual([
      {
        user_id: 'u1',
        external_id: '123',
        source: 'garmin',
        date: '2026-10-31',
        sport: 'walk',
        duration_s: 2400,
        distance_m: 4000,
        hr_avg: 101,
        elevation_m: 13,
      },
    ])
  })

  it('leaves out a distance of zero and a heart rate that makes no sense', () => {
    const [row] = toRows([{ ...walk, activityType: { typeKey: 'pilates' }, distance: 0, averageHR: 5, elevationGain: undefined }], 'u1')
    expect(row).toMatchObject({ sport: 'pilates', distance_m: null, hr_avg: null, elevation_m: null })
  })

  it('skips an entry with no id or date, or under a minute', () => {
    expect(toRows([{ ...walk, activityId: undefined }, { ...walk, startTimeLocal: undefined }, { ...walk, duration: 20 }], 'u1')).toEqual([])
  })
})

describe('duplicateManualWalks', () => {
  const rows = toRows([walk], 'u1')

  it('finds a typed-in walk of similar length on the same day', () => {
    expect(duplicateManualWalks(rows, [{ id: 'm1', date: '2026-10-31', duration_s: 2700 }])).toEqual(['m1'])
  })

  it('keeps a different walk, another day, and other sports', () => {
    expect(
      duplicateManualWalks(rows, [
        { id: 'long', date: '2026-10-31', duration_s: 3600 },
        { id: 'other-day', date: '2026-10-30', duration_s: 2400 },
      ]),
    ).toEqual([])
    const pilates = toRows([{ ...walk, activityType: { typeKey: 'pilates' } }], 'u1')
    expect(duplicateManualWalks(pilates, [{ id: 'm1', date: '2026-10-31', duration_s: 2400 }])).toEqual([])
  })

  it('removes one typed-in walk for each watch walk', () => {
    const manual = [
      { id: 'm1', date: '2026-10-31', duration_s: 2400 },
      { id: 'm2', date: '2026-10-31', duration_s: 2400 },
    ]
    expect(duplicateManualWalks(rows, manual)).toEqual(['m1'])
  })
})

describe('lastDays', () => {
  it('goes back the days asked, up to tomorrow', () => {
    expect(lastDays(28, Date.UTC(2026, 9, 31))).toEqual({ startDate: '2026-10-03', endDate: '2026-11-01' })
  })
})
