// Which pain question a session asks, by its kind. Kinds not listed ask nothing.
// Adding an area or a new kind later is one line here.
import { FOOT, kindOf } from '@/data/rules'

export type PainArea = { body_area: string; side: string | null; label: string; short: string }

const FOOT_AREA: PainArea = { ...FOOT, label: 'Piede destro, durante', short: 'Piede' }

const BY_KIND: Record<string, PainArea> = {
  foot: FOOT_AREA,
  test: FOOT_AREA, // heel-raise test: stop if pain goes above Lieve
}

export function painAreaFor(kind: string): PainArea | null {
  return BY_KIND[kindOf(kind)] ?? null
}
