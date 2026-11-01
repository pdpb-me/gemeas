import { data, READS } from '@/data/store'
import { useQuery } from '@/data/use-query'
import { addDays, weekOf } from '@/lib/dates'
import { historyOf } from '@/lib/history'

// 'YYYY-MM' → the Mondays that fall in that month. A week belongs to the month of its Monday,
// so a week across two months shows once.
export function mondaysOf(month: string) {
  const first = weekOf(`${month}-01`)[0]
  const start = first < `${month}-01` ? addDays(first, 7) : first
  const mondays: string[] = []
  for (let d = start; d.startsWith(month); d = addDays(d, 7)) mondays.push(d)
  return mondays
}

// The history for one month's weeks, newest first, plus the month of the oldest entry, so the
// switcher knows where to stop.
export function useActivitiesMonth(month: string) {
  const mondays = mondaysOf(month)
  const from = mondays[0]
  const to = addDays(mondays[mondays.length - 1], 6)
  const list = useQuery(`activities:${from}:${to}`, READS.activities, () => data.activities(from, to))
  const done = useQuery(`done-sessions:${from}:${to}`, READS.doneSessions, () => data.doneSessions(from, to))
  const oldest = useQuery('activities-oldest', READS.oldestActivityDate, data.oldestActivityDate)
  const oldestDone = useQuery('done-sessions-oldest', READS.oldestDoneSessionDate, data.oldestDoneSessionDate)
  const first = [oldest.data, oldestDone.data].filter((d): d is string => !!d).sort()[0]
  return {
    items: list.data && done.data && historyOf(list.data, done.data),
    error: list.error ?? done.error,
    retry: () => {
      list.retry()
      done.retry()
    },
    oldestMonth: first ? weekOf(first)[0].slice(0, 7) : null,
  }
}
