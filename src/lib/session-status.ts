// Session status: one table for the words, the order and the colours
import type { DaySession, Status } from '@/data/types'
import { happened } from '@/data/rules'
import type { PainBand } from '@/lib/pain'
import { painAreaFor } from '@/lib/pain-areas'

export const STATUSES: { value: Status; label: string }[] = [
  { value: 'done', label: 'Fatto' },
  { value: 'partial', label: 'In parte' },
  { value: 'skipped', label: 'Saltato' },
]

export const statusLabel = (s: string) => STATUSES.find((x) => x.value === s)?.label ?? s

// Counts toward "done" in the week (done or partly)
export const countsAsDone = happened

export const PAIN_DOT: Record<PainBand, string> = {
  low: 'good',
  mid: 'fair',
  high: 'poor',
}

// The pain score asked during this session, if any
export function sessionPain(session: DaySession) {
  const area = painAreaFor(session.kind)
  const score = session.log?.symptoms.find((s) => s.body_area === area?.body_area && s.timing === 'during')?.score ?? null
  return { area, score }
}
