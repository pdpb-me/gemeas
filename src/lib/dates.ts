// Dates are stored as plain 'YYYY-MM-DD' in the phone's local time zone,
// so "today" means today where you are, not in UTC.

export function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Noon avoids summer-time edges when counting days
const noon = (iso: string) => new Date(`${iso}T12:00:00`)

export function addDays(iso: string, days: number) {
  const d = noon(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

// Whole days from one date to another (negative if `to` is earlier)
export function daysBetween(from: string, to: string) {
  return Math.round((noon(to).getTime() - noon(from).getTime()) / 86_400_000)
}

// Monday to Sunday of the week that contains this date
export function weekOf(iso: string) {
  const monday = addDays(iso, -((noon(iso).getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export const mondayOf = (iso: string) => weekOf(iso)[0]

// 'YYYY-MM' moved by whole months
export function shiftMonth(month: string, by: number) {
  const d = noon(`${month}-01`)
  d.setMonth(d.getMonth() + by)
  return toISODate(d).slice(0, 7)
}

// The app's day starts at 04:00: at 00:30 it's still "today" (the evening check-in
// belongs to the day that's ending), and the morning starts with the first steps.
export const DAY_STARTS_AT = 4

export function appDay(at: Date) {
  return toISODate(new Date(at.getTime() - DAY_STARTS_AT * 3_600_000))
}
