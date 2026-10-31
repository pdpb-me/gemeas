import type { ReactNode } from 'react'
import { ScreenHeader } from '@/components/screen-header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RANGES, type RangeId } from '@/lib/ranges'

export function RangeTabs({ value, onChange }: { value: RangeId; onChange: (id: RangeId) => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as RangeId)}>
      <TabsList>
        {RANGES.map((r) => (
          <TabsTrigger key={r.id} value={r.id}>
            {r.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

// A detail screen under Progress: back, title, sub, then its cards on the grey ground
export function DetailScreen({ title, sub, onBack, children }: { title: string; sub: string; onBack: () => void; children: ReactNode }) {
  return (
    <main className="animate-screen-in mx-auto flex min-h-svh max-w-md flex-col pb-8">
      <header className="flex flex-col gap-1 border-b bg-card pb-4">
        <ScreenHeader back="Progressi" onBack={onBack} />
        <h1 className="px-4 text-display font-bold">{title}</h1>
        <p className="px-4 text-sm text-muted-foreground">{sub}</p>
      </header>
      <div className="flex flex-col gap-3 p-4">{children}</div>
    </main>
  )
}
