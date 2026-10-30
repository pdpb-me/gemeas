import { useCallback, useEffect, useRef, useState } from 'react'
import { popTakenBySheet } from '@/hooks/use-back-stack'

// A small stack of screens inside one tab (e.g. Today → session → exercise).
// Each push adds a browser history entry, so the phone's back gesture goes
// back one screen instead of leaving the app.
// Going back returns to where the screen was scrolled.
export function useScreens<T>(root: T) {
  const [stack, setStack] = useState<T[]>([root])
  const scrolls = useRef<number[]>([])

  useEffect(() => {
    const onPop = () => {
      if (popTakenBySheet()) return // the back gesture closed a sheet, not this screen
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
      const y = scrolls.current.pop() ?? 0
      requestAnimationFrame(() => window.scrollTo(0, y))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const push = useCallback((screen: T) => {
    scrolls.current.push(window.scrollY)
    window.history.pushState({ gemeas: true }, '')
    setStack((s) => [...s, screen])
    window.scrollTo(0, 0)
  }, [])

  // Swap the current screen without a new history entry (e.g. "Next exercise")
  const replace = useCallback((screen: T) => {
    setStack((s) => [...s.slice(0, -1), screen])
    window.scrollTo(0, 0)
  }, [])

  const back = useCallback(() => window.history.back(), [])

  return { screen: stack[stack.length - 1], depth: stack.length, push, replace, back }
}
