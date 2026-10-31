import { useState } from 'react'
import { FlaskConicalIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { now } from '@/lib/clock'
import { cn } from '@/lib/utils'
import { demo, SCENARIOS } from '@/demo/state'

const hidden = new URLSearchParams(location.search).get('bar') === '0' // ?bar=0: clean screenshots

function moment(d: Date) {
  return `${d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
}

// A thin strip at the top of the demo: it says it's a demo, and opens the time controls
export function DemoBar() {
  const [open, setOpen] = useState(false)
  if (hidden) return null
  const current = demo.scenario()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="plain flex h-11 w-full items-center justify-center gap-2 bg-foreground text-xs font-bold text-card"
      >
        <FlaskConicalIcon className="size-3.5" />
        Demo · dati inventati · {moment(now())}
        <span className="underline underline-offset-2">Cambia</span>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
            <DrawerHeader>
              <DrawerTitle>Demo</DrawerTitle>
              <DrawerDescription>Dati inventati, salvati solo in questo browser. Ora è {moment(now())}.</DrawerDescription>
            </DrawerHeader>
            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4 pb-6">
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="h-11" onClick={() => demo.setTime('07:30')}>
                  Mattina
                </Button>
                <Button variant="outline" className="h-11" onClick={() => demo.setTime('19:30')}>
                  Sera
                </Button>
                <Button className="h-11" onClick={() => demo.nextDay()}>
                  Giorno dopo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Andando avanti compare quello che avrebbe aggiunto il coach. Le tue registrazioni restano tue: niente si compila da solo.
              </p>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Vai a un momento</span>
                {SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => demo.open(s.id)}
                    className={cn(
                      'row min-h-14 flex-col items-start justify-center gap-0 px-3 py-2',
                      s.id === current.id && 'on',
                    )}
                  >
                    <span className="text-sm font-bold">{s.title}</span>
                    <span className="text-xs text-muted-foreground">{s.about}</span>
                  </button>
                ))}
              </div>
              <Button variant="ghost" className="h-11 text-muted-foreground" onClick={() => demo.reset()}>
                Ricomincia “{current.title}”
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
