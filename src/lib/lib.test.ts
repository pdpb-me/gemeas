import { describe, expect, it } from 'vitest'
import { dueCheckIn } from '@/lib/check-ins'
import { addDays, appDay, daysBetween, toISODate, weekOf } from '@/lib/dates'
import { atPercent, dayMonth, duration, inDays, kg, km, monthName, plural, relativeDay } from '@/lib/format'
import { painBand, painLabel, painLevelFor } from '@/lib/pain'
import { compare, dailySeries, footSummary, headline, zoneLine } from '@/lib/trends'
import { rightOfLeft, testDays } from '@/lib/tests'
import { averageKg } from '@/lib/weight'

describe('dates (local calendar days)', () => {
  it('adds days across the end of summer time (25 Oct 2026, Europe)', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })
  it('gives Monday to Sunday', () => {
    expect(weekOf('2026-11-19')).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ])
    expect(weekOf('2026-11-22')[0]).toBe('2026-11-16') // Sunday belongs to the week before
    expect(weekOf('2026-11-01')[0]).toBe('2026-10-26') // across a month
  })
  it('uses the local date, not UTC', () => {
    expect(toISODate(new Date(2026, 9, 25, 0, 30))).toBe('2026-10-25')
  })
})

describe('words in Italian', () => {
  it("says al or all' before a percentage", () => {
    expect([50, 100, 18, 80, 85, 8, 11, 1].map(atPercent)).toEqual(['al 50%', 'al 100%', 'al 18%', "all'80%", "all'85%", "all'8%", "all'11%", "all'1%"])
  })

  it('writes dates, amounts and plurals', () => {
    expect(dayMonth('2026-11-19')).toBe('19 nov')
    expect(monthName('2026-11')).toBe('Novembre 2026')
    expect(relativeDay('2026-11-18', '2026-11-19')).toBe('Ieri')
    expect(inDays('2026-11-22', '2026-11-19')).toBe('tra 3 giorni')
    expect(km(4500)).toBe('4,5 km')
    expect(kg(62.4)).toBe('62,4 kg')
    expect(duration(3900)).toBe('1 h 05')
    expect(plural(1, 'giorno', 'giorni')).toBe('1 giorno')
    expect(plural(9, 'giorno', 'giorni')).toBe('9 giorni')
  })
  it('maps any 0–10 score to its pain word', () => {
    expect([0, 1, 3, 4, 6, 7, 8, 9, 10].map(painLabel)).toEqual(['Nessuno', 'Lieve', 'Lieve', 'Medio', 'Medio', 'Forte', 'Forte', 'Massimo', 'Massimo'])
    expect(painLevelFor(5)).toBe(5)
    expect(painBand(3)).toBe('low')
    expect(painBand(4)).toBe('mid')
    expect(painBand(7)).toBe('high')
  })
})

describe('trends', () => {
  const day = (date: string, score: number) => ({ date, body_area: 'foot', timing: 'next_morning', score })
  it('keeps one value per day (the highest), null when not answered', () => {
    const s = dailySeries([day('2026-11-18', 2), day('2026-11-18', 5), day('2026-11-16', 0)], '2026-11-19', 4)
    expect(s.map((d) => d.score)).toEqual([0, null, 5, null])
  })
  it('compares only with at least 3 answers on each side, and ±1 point counts', () => {
    expect(compare([2, 2], [5, 5, 5]).verdict).toBe('none')
    expect(compare([2, 2, 2], [5, 5, 5]).verdict).toBe('better')
    expect(compare([2, 2, 2], [2, 2, 2.5]).verdict).toBe('same')
    expect(compare([5, 5, 5, null], [2, 2, 2]).verdict).toBe('worse')
  })
})

describe('weight', () => {
  const w = (date: string, kilos: number) => ({ date, kg: kilos })
  it('averages the entries in a period', () => {
    const list = [w('2026-11-05', 62), w('2026-11-08', 63), w('2026-11-20', 70)]
    expect(averageKg(list, '2026-11-01', '2026-11-10')).toEqual({ kg: 62.5, n: 2 })
    expect(averageKg(list, '2026-12-01', '2026-12-10')).toBeNull()
  })
})

describe('whether the check-in is asked', () => {
  it('asks today, lets past days be filled in, and asks nothing of the future', () => {
    expect(dueCheckIn('2026-11-19', '2026-11-19')).toBe('now')
    expect(dueCheckIn('2026-11-18', '2026-11-19')).toBe('fill-in')
    expect(dueCheckIn('2026-11-20', '2026-11-19')).toBe('none')
  })
})

describe('the app day', () => {
  it('starts at 04:00', () => {
    expect(appDay(new Date(2026, 10, 19, 0, 30))).toBe('2026-11-18')
    expect(appDay(new Date(2026, 10, 19, 4, 0))).toBe('2026-11-19')
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2) // across the summer-time change
  })
})

describe('foot summary and headline', () => {
  const s = (date: string, score: number) => ({ date, body_area: 'foot', timing: 'next_morning', score })
  it('shows the worse of the week and the latest answer', () => {
    const list = [s('2026-11-13', 2), s('2026-11-14', 0), s('2026-11-15', 0), s('2026-11-16', 8)]
    const a = footSummary(list, '2026-11-16')
    expect(a.typical).toBe(3) // (2 + 0 + 0 + 8) / 4 = 2.5 → 3
    expect(a.latest).toEqual({ date: '2026-11-16', score: 8 })
    expect(a.worst).toBe(8)
  })
  it('says nothing with fewer than 3 answers', () => {
    expect(footSummary([s('2026-11-16', 0)], '2026-11-16').typical).toBeNull()
  })
  it('writes one plain sentence', () => {
    expect(headline('worse')).toBe('Piede peggio della settimana prima.')
    expect(headline('none')).toBe('Ancora poche risposte per confrontare le settimane.')
  })
})

describe('heel-raise tests', () => {
  it('groups results per day and compares the right with the left', () => {
    const days = testDays([
      { date: '2026-10-26', side: 'R', value: 17 },
      { date: '2026-09-17', side: 'L', value: 21 },
      { date: '2026-10-26', side: 'L', value: 23 },
      { date: '2026-09-17', side: 'R', value: 12 },
    ])
    expect(days).toEqual([
      { date: '2026-09-17', L: 21, R: 12 },
      { date: '2026-10-26', L: 23, R: 17 },
    ])
    expect(rightOfLeft(days[1])).toBe(74)
  })
})

describe('a flare is never hidden', () => {
  const s = (date: string, score: number) => ({ date, body_area: 'foot', timing: 'next_morning', score })
  it('puts a hard latest answer first in the headline and the zone line', () => {
    expect(headline('same', 'Piede Forte ven.')).toBe('Piede Forte ven. Piede più o meno come la settimana prima.')
    const a = footSummary([s('2026-11-13', 2), s('2026-11-14', 2), s('2026-11-15', 2), s('2026-11-16', 8)], '2026-11-16')
    expect(zoneLine(a)).toBe('Ultima risposta Forte: zona stop. Riposa il piede oggi e avvisa il coach.')
  })
})
