import { useState } from 'react'
import { ChartLineIcon, SunIcon } from 'lucide-react'
import { Login } from '@/components/login'
import { Progress } from '@/components/progress'
import { Today } from '@/components/today'
import { DemoBar } from '@/data/backend'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'today', label: 'Oggi', icon: SunIcon },
  { id: 'progress', label: 'Progressi', icon: ChartLineIcon },
] as const
type Tab = (typeof TABS)[number]['id']

function App() {
  const signedIn = useSession()
  const [tab, setTab] = useState<Tab>('today')
  // a session or exercise screen has its own buttons at the bottom: hide the tab bar there
  const [deep, setDeep] = useState(false)
  if (signedIn === undefined) return null // still checking, a split second
  if (signedIn === false) return <Login />
  return (
    <>
      {DemoBar && <DemoBar />}
      {/* room for the bottom bar */}
      <div className={deep ? undefined : 'pb-20'}>
        {tab === 'today' ? <Today onDeepChange={setDeep} /> : <Progress onDeepChange={setDeep} />}
      </div>
      {!deep && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Principale">
          <div className="mx-auto flex max-w-md">
            {TABS.map(({ id, label, icon: Icon }) => (
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
                  'flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium',
                  tab === id ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className={cn('flex h-7 w-14 items-center justify-center rounded-full transition-colors', tab === id && 'bg-muted')}>
                  <Icon className="size-5" strokeWidth={tab === id ? 2.4 : 2} />
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
