import { useSyncExternalStore } from 'react'
import { appDay } from '@/lib/dates'

// The one place that knows "now". The real app follows the phone's clock; the demo
// sets it to a made-up moment (it keeps ticking from there). Everything that needs
// today's date or the hour asks here, never `new Date()` directly.
let offsetMs = 0
const listeners = new Set<() => void>()

export function now() {
  return new Date(Date.now() + offsetMs)
}

// Demo only: make "now" this moment (time keeps running from it)
export function setNow(at: Date) {
  offsetMs = at.getTime() - Date.now()
  emit()
}

function emit() {
  for (const l of listeners) l()
}

// Re-check when the app comes back to the front, and at the next minute: an app left
// open overnight moves on to the new day by itself.
function subscribe(listener: () => void) {
  listeners.add(listener)
  const onVisible = () => document.visibilityState === 'visible' && listener()
  document.addEventListener('visibilitychange', onVisible)
  const timer = window.setInterval(listener, 60_000)
  return () => {
    listeners.delete(listener)
    document.removeEventListener('visibilitychange', onVisible)
    window.clearInterval(timer)
  }
}

// Today's date ('YYYY-MM-DD', local) that re-renders when the day changes. The app's
// day starts at 04:00 (see appDay): at 00:30 the evening check-in is still "today".
export function useToday() {
  return useSyncExternalStore(subscribe, () => appDay(now()))
}

// The current hour (0–23), re-rendering when it changes
export function useHour() {
  return useSyncExternalStore(subscribe, () => now().getHours())
}
