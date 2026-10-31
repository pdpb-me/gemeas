// Garmin's Personal API → `gemeas.activities` rows. No Node or Deno APIs, so the tests can run it.
//
// Only these columns are written: Garmin's answer also holds the owner's name and GPS points,
// which stay out of the database. `plan_session_id` and `notes` are kept when a row is synced again.

const HOST = 'https://personal.connectapi.garmin.com'

type GarminActivity = {
  activityId?: number
  startTimeLocal?: string
  activityType?: { typeKey?: string }
  duration?: number
  distance?: number
  averageHR?: number
  elevationGain?: number
}

type ManualWalk = { id: string; date: string; duration_s: number | null }

// How close a typed-in walk's length must be to count as the same walk
const SAME_WALK_S = 10 * 60
const MIN_S = 60

const SPORT: Record<string, string> = {
  walking: 'walk',
  casual_walking: 'walk',
  speed_walking: 'walk',
  hiking: 'hike',
  strength_training: 'strength',
}
const sportOf = (type?: string) => (type ? (SPORT[type] ?? type) : 'other')

const int = (n?: number) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n) : null)
const positive = (n?: number) => int(n) || null
const hr = (n?: number) => {
  const v = int(n)
  return v != null && v >= 20 && v <= 250 ? v : null
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

// The last `days` days up to tomorrow (tomorrow covers time zones)
export function lastDays(days: number, now = Date.now()) {
  return { startDate: isoDay(new Date(now - days * 86400000)), endDate: isoDay(new Date(now + 86400000)) }
}

// An access token lasts 24 hours and can't be refreshed: each sync asks for a new one
async function accessToken(apiKey: string) {
  const res = await fetch(`${HOST}/personalapitoken-service/personal-api/personal-api-key/token`, {
    method: 'POST',
    headers: { Authorization: `ApiKey ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Garmin token: answered ${res.status}`)
  return (await res.text()).trim()
}

export async function fetchActivities(apiKey: string, { startDate, endDate }: { startDate: string; endDate: string }) {
  const token = await accessToken(apiKey)
  const query = new URLSearchParams({ start: '0', limit: '100', startDate, endDate })
  const res = await fetch(`${HOST}/activitylist-service/activities/search/activities?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Garmin activities: answered ${res.status}`)
  return (await res.json()) as GarminActivity[]
}

// Skips entries without a usable id or date, and anything started by mistake
export function toRows(list: GarminActivity[], userId: string) {
  return list
    .filter((a) => a.activityId && a.startTimeLocal && (a.duration ?? 0) >= MIN_S)
    .map((a) => ({
      user_id: userId,
      external_id: String(a.activityId),
      source: 'garmin',
      date: a.startTimeLocal!.slice(0, 10),
      sport: sportOf(a.activityType?.typeKey),
      duration_s: int(a.duration),
      distance_m: positive(a.distance),
      hr_avg: hr(a.averageHR),
      elevation_m: a.elevationGain == null ? null : Math.round(a.elevationGain),
    }))
}

// The typed-in walks the watch has now recorded: same day, similar length, one for each watch walk
export function duplicateManualWalks(rows: ReturnType<typeof toRows>, manual: ManualWalk[]) {
  const left = [...manual]
  const ids: string[] = []
  for (const row of rows) {
    if (row.sport !== 'walk' || row.duration_s == null) continue
    const i = left.findIndex(
      (m) => m.date === row.date && m.duration_s != null && Math.abs(m.duration_s - row.duration_s!) <= SAME_WALK_S,
    )
    if (i >= 0) ids.push(left.splice(i, 1)[0].id)
  }
  return ids
}
