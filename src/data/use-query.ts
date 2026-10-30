import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { onDataChange, refreshAll, type Table } from '@/data/store'

// Loads data for a screen. It loads again when a save touches one of `tables`, and
// when the app comes back to the front after a minute away or the phone is back
// online (the coach or the watch sync may have added something).
// `key` names what is loaded (e.g. 'day:2026-10-19'): a new key loads anew. With
// keepPrevious, the old data stays on screen until the new data is in (no flash).
export function useQuery<T>(key: string, tables: readonly Table[], load: () => Promise<T>, { keepPrevious = false } = {}) {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key })
  const [version, setVersion] = useState(0)
  const loadRef = useRef(load)
  useLayoutEffect(() => {
    loadRef.current = load
  })
  const tablesKey = tables.join(',')

  useEffect(
    () =>
      onDataChange((touched) => {
        if (tablesKey.split(',').some((t) => touched.has(t as Table))) setVersion((v) => v + 1)
      }),
    [tablesKey],
  )

  useEffect(() => {
    let live = true
    loadRef.current().then(
      (data) => live && setState({ key, data }),
      (e: Error) => {
        console.error(e)
        if (live) setState((s) => ({ key, data: s.key === key ? s.data : undefined, error: e.message }))
      },
    )
    return () => {
      live = false
    }
  }, [key, version])

  const current = state.key === key || keepPrevious
  return {
    data: current ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    retry: () => setVersion((v) => v + 1),
  }
}

// Reload everything when the app returns after a while, or the phone is back online
let hiddenAt = 0
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now()
    else if (hiddenAt && Date.now() - hiddenAt > 60_000) refreshAll()
  })
  window.addEventListener('online', refreshAll)
}
