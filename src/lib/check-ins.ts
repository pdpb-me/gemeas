// Whether Today asks the morning check-in (the foot at first steps): from the start of the
// day until answered. Past days can be filled in; future days ask nothing.
export type Ask = 'now' | 'fill-in' | 'none'

export function dueCheckIn(date: string, today: string): Ask {
  if (date > today) return 'none'
  return date < today ? 'fill-in' : 'now'
}
