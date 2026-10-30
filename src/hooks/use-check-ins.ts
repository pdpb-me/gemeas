import { data, READS, write } from '@/data/store'
import type { CheckIns } from '@/data/types'
import { useQuery } from '@/data/use-query'
import { usePending } from '@/hooks/use-pending'

// The day's morning check-in. A tap shows at once.
export function useCheckIns(date: string) {
  const query = useQuery(`check-ins:${date}`, READS.checkIns, () => data.checkIns(date))
  const pending = usePending<number | null>(query.data)

  let shown: CheckIns | undefined = query.data
  if (shown) {
    const c = { ...shown }
    const f = pending.get('foot')
    if (f) c.foot = f.value
    const w = pending.get('weight')
    if (w) c.weight = w.value
    shown = c
  }

  return {
    checkIns: shown,
    error: query.error,
    retry: query.retry,
    save: (score: number | null) => pending.tap('foot', score, () => write.saveCheckIn(date, score)),
    saveWeight: (kg: number | null) => pending.tap('weight', kg, () => write.saveWeight(date, kg)),
  }
}
