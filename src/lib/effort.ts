// "Quanto è stata dura?": asked after a lesson with the trainer, so the coach can fit
// the other workouts around it.
import { kindOf } from '@/data/rules'
import type { Effort } from '@/data/types'

export const EFFORTS: { value: Effort; label: string }[] = [
  { value: 'light', label: 'Leggera' },
  { value: 'medium', label: 'Media' },
  { value: 'hard', label: 'Dura' },
]

export const effortLabel = (e: string) => EFFORTS.find((x) => x.value === e)?.label ?? e

export const asksEffort = (kind: string) => kindOf(kind) === 'trainer'
