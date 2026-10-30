// How dates, times and amounts read in the app (Italian)
import { addDays, daysBetween } from '@/lib/dates'

const noon = (iso: string) => new Date(`${iso}T12:00:00`)
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => noon(iso).toLocaleDateString('it-IT', o)

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const weekday = (iso: string) => capitalize(fmt(iso, { weekday: 'long' })) // 'Giovedì'
export const weekdayShort = (iso: string) => fmt(iso, { weekday: 'short' }) // 'gio'
export const weekdayLetter = (iso: string) => fmt(iso, { weekday: 'narrow' }).toUpperCase() // 'G'
export const dayMonth = (iso: string) => fmt(iso, { day: 'numeric', month: 'short' }) // '19 nov'
export const dayLabel = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' }) // 'gio 19 nov'
export const longDate = (iso: string) => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' }) // 'giovedì 19 novembre'
export const monthName = (month: string) => capitalize(fmt(`${month}-01`, { month: 'long', year: 'numeric' })) // 'Novembre 2026'

// 'Oggi', 'Ieri', 'Domani', else 'gio 19 nov'
export function relativeDay(iso: string, today: string) {
  if (iso === today) return 'Oggi'
  if (iso === addDays(today, -1)) return 'Ieri'
  if (iso === addDays(today, 1)) return 'Domani'
  return dayLabel(iso)
}

// 'tra 3 giorni', 'domani', 'oggi', '2 giorni fa'
export function inDays(iso: string, today: string) {
  const n = daysBetween(today, iso)
  if (n === 0) return 'oggi'
  if (n === 1) return 'domani'
  if (n === -1) return 'ieri'
  return n > 0 ? `tra ${n} giorni` : `${-n} giorni fa`
}

// '33 min', '1 h 05'
export function duration(seconds: number | null | undefined) {
  if (seconds == null) return '–'
  const m = Math.round(seconds / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}

// Numbers as text use a comma (the boxes accept a point too)
export const decimal = (n: number, digits = 1) => n.toFixed(digits).replace('.', ',')

export const km = (metres: number) => `${decimal(metres / 1000)} km`
export const kg = (n: number) => `${decimal(n)} kg`

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
