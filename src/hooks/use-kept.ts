import { useState } from 'react'

// Like useState, but the value stays while the screen is away (another tab), until the app
// is closed. Each key is one place in the app.
const kept = new Map<string, unknown>()

export function useKept<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (kept.has(key) ? (kept.get(key) as T) : initial))
  const set = (next: T) => {
    kept.set(key, next)
    setValue(next)
  }
  return [value, set] as const
}
