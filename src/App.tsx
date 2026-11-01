import { Suspense, useEffect, useState } from 'react'
import { ChartLineIcon, DumbbellIcon, MessageSquareTextIcon, SunIcon } from 'lucide-react'
import { CoachChat } from '@/components/coach-chat'
import { Login } from '@/components/login'
import { Progress } from '@/components/progress'
import { CardSkeleton } from '@/components/states'
import { Today } from '@/components/today'
import { DemoBar, DemoLibrary } from '@/data/backend'
import { syncWatch } from '@/data/store'
import { useCoachAvailable } from '@/hooks/use-data'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'today', label: 'Oggi', icon: SunIcon },
  { id: 'progress', label: 'Progressi', icon: ChartLineIcon },
  // Only for who has the chat
  { id: 'coach', label: 'Coach', icon: MessageSquareTextIcon },
  // Only the demo has the video list, for now
  ...(DemoLibrary ? [{ id: 'library', label: 'Esercizi', icon: DumbbellIcon }] : []),
]

function App() {
  const signedIn = useSession()
  const hasCoach = useCoachAvailable(signedIn === true)
  const [tab, setTab] = useState('today')
  // a session or exercise screen has its own buttons at the bottom: hide the tab bar there
  const [deep, setDeep] = useState(false)
  // The app opened, or came back to the front
  useEffect(() => {
    if (!signedIn) return
    void syncWatch()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncWatch()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [signedIn])
  if (signedIn === undefined) return null // still checking, a split second
  if (signedIn === false) return <Login />
  return (
    <>
      {DemoBar && <DemoBar />}
      {/* room for the bottom bar */}
      <div className={deep ? undefined : 'pb-20'}>
        {tab === 'today' && <Today onDeepChange={setDeep} />}
        {tab === 'progress' && <Progress onDeepChange={setDeep} />}
        {tab === 'coach' && <CoachChat />}
        {tab === 'library' && DemoLibrary && (
          <Suspense fallback={<CardSkeleton className="m-4" />}>
            <DemoLibrary />
          </Suspense>
        )}
      </div>
      {!deep && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card pb-[env(safe-area-inset-bottom)]" aria-label="Principale">
          <div className="mx-auto flex max-w-md">
            {TABS.filter(({ id }) => id !== 'coach' || hasCoach).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id)
                  setDeep(false)
                  window.scrollTo(0, 0)
                }}
                aria-current={tab === id ? 'page' : undefined}
                className={cn(
                  'plain flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-bold',
                  tab === id ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className={cn('flex h-7 w-14 items-center justify-center rounded-4xl', tab === id && 'bg-foreground text-card')}>
                  <Icon className="size-5" strokeWidth={2.25} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </>
  )
}

export default App
