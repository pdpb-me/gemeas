// The Activities tab's history: what the watch recorded and the planned sessions she logged.
// A session the watch also recorded that day shows once, with the watch's real numbers.
import { isPill } from '@/data/rules'
import type { ActivityRow, DoneSession } from '@/data/types'
import { dogForSport } from '@/lib/dachshunds'
import { sessionMinutes } from '@/lib/session-time'

export type HistoryRow = ActivityRow & { title?: string; note?: string; estimated?: boolean }

// A walk planned and a light run recorded are the same outing; any session indoors can be
// pilates or strength on the watch.
function family(sport: string) {
  const dog = dogForSport(sport)
  if (dog === 'cycle') return 'bike'
  return dog || sport === 'hike' ? 'on-foot' : 'indoors'
}

export function historyOf(activities: ActivityRow[], sessions: DoneSession[]): HistoryRow[] {
  const unmatched = [...activities]
  const logged: HistoryRow[] = []
  for (const s of sessions) {
    // a pill is a few minutes inside another workout: the watch never records it alone
    const twin = isPill(s.kind) ? -1 : unmatched.findIndex((a) => a.date === s.date && family(a.sport) === family(s.kind))
    if (twin >= 0) {
      unmatched.splice(twin, 1)
      continue
    }
    const partly = s.status === 'partial'
    const estimate = partly || s.minutes != null ? null : sessionMinutes(s)
    const minutes = s.minutes ?? estimate
    logged.push({
      id: s.id,
      date: s.date,
      sport: s.kind,
      source: 'plan',
      duration_s: minutes == null ? null : minutes * 60,
      distance_m: null,
      title: s.title,
      note: partly ? 'In parte' : undefined,
      estimated: estimate != null,
    })
  }
  return [...activities, ...logged].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
