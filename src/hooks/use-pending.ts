import { useEffect, useState } from 'react'

// Taps that show at once, before they're saved. Each tap is kept until the screen's data
// has reloaded after its save (then the saved value shows); a failed save reloads too,
// so the tap disappears and what is really saved shows.
export function usePending<V>(loaded: unknown) {
  const [taps, setTaps] = useState<Record<string, { value: V; saved: boolean }>>({})

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- drop taps the reloaded data now shows
    setTaps((t) => (Object.values(t).some((x) => x.saved) ? Object.fromEntries(Object.entries(t).filter(([, x]) => !x.saved)) : t))
  }, [loaded])

  async function tap(key: string, value: V, save: () => Promise<boolean>) {
    setTaps((t) => ({ ...t, [key]: { value, saved: false } }))
    const ok = await save()
    setTaps((t) => (t[key] ? { ...t, [key]: { ...t[key], saved: true } } : t))
    return ok
  }

  const get = (key: string): { value: V } | undefined => taps[key]
  return { tap, get }
}
