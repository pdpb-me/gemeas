import { ChevronLeftIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

// The top of a pushed screen: back (with where it goes), and an optional action on the right
export function ScreenHeader({ back, onBack, action }: { back: string; onBack: () => void; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 pt-2">
      <Button variant="ghost" className="h-11 gap-0.5 rounded-full px-2 text-base font-normal" onClick={onBack}>
        <ChevronLeftIcon className="size-6" />
        {back}
      </Button>
      {action}
    </div>
  )
}
