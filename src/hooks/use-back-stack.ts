import { useEffect, useRef } from 'react'

// The phone's back gesture closes one thing at a time: the open sheet first, then the
// screen (use-screens.ts). An open sheet adds its own history entry; closing it some
// other way (Close, swipe, tap outside) takes that entry back out quietly.
const sheets: (() => void)[] = []
let ignore = 0 // pops we caused ourselves, to let through without closing anything
let consumed = false

// Registered before any screen's listener (at import), so it runs first on every pop
window.addEventListener('popstate', () => {
  consumed = true
  if (ignore > 0) {
    ignore--
    return
  }
  const close = sheets.pop()
  if (close) close()
  else consumed = false
})

// For use-screens.ts: true when this pop belonged to a sheet, not to a screen
export const popTakenBySheet = () => consumed

export function useBackCloses(open: boolean, close: () => void) {
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })

  useEffect(() => {
    if (!open) return
    const entry = () => closeRef.current()
    window.history.pushState({ gemeasSheet: true }, '')
    sheets.push(entry)
    return () => {
      const i = sheets.indexOf(entry)
      if (i < 0) return // the back gesture closed it: its entry is already gone
      sheets.splice(i, 1)
      ignore++
      window.history.back()
    }
  }, [open])
}
