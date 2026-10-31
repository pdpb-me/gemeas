import { CloudOffIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// When something couldn't load: say so plainly, and offer to try again
export function ErrorCard({ what = 'questo contenuto', onRetry, className }: { what?: string; onRetry: () => void; className?: string }) {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  return (
    <Card role="alert" className={cn('flex-row items-center gap-3 px-4 py-3', className)}>
      <CloudOffIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-bold">Impossibile caricare {what}</span>
        <span className="text-sm text-muted-foreground">{offline ? 'Sembra che tu sia offline.' : 'Controlla la connessione.'}</span>
      </div>
      <Button variant="outline" className="h-11 rounded-full" onClick={onRetry}>
        Riprova
      </Button>
    </Card>
  )
}

// A calm line for "nothing here (yet)", with an optional picture and action
export function EmptyNote({ title, children, action, picture }: { title: string; children?: ReactNode; action?: ReactNode; picture?: ReactNode }) {
  return (
    <Card className="items-start gap-1 px-4 py-4">
      {picture && <div className="mb-2 self-stretch">{picture}</div>}
      <span className="text-[17px] font-bold">{title}</span>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
      {action}
    </Card>
  )
}

// A card with soft bars, the shape of what's coming
export function CardSkeleton({ rows = 2, className }: { rows?: number; className?: string }) {
  return (
    <Card className={cn('gap-4 px-4 py-4', className)} aria-busy="true" aria-label="Caricamento">
      <Skeleton className="h-4 w-28" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-sm" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </Card>
  )
}
