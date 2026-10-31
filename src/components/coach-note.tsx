import { useState } from 'react'
import { useBackCloses } from '@/hooks/use-back-stack'
import { MessageSquareTextIcon } from 'lucide-react'
import { RowArrow } from '@/components/status-mark'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import type { Review } from '@/data/types'
import { dayMonth } from '@/lib/format'
import { getPref, setPref } from '@/lib/prefs'

// Paragraphs as the coach wrote them (a new line starts a new paragraph)
function Text({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <>
      {text.split(/\n+/).map((p, i) => (
        <p key={i} className="text-base leading-relaxed">
          {p}
        </p>
      ))}
    </>
  )
}

export function CoachNoteSheet({ review, open, onOpenChange }: { review: Review; open: boolean; onOpenChange: (o: boolean) => void }) {
  useBackCloses(open, () => onOpenChange(false))
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-h2">Dal tuo coach</DrawerTitle>
            <DrawerDescription>Settimana del {dayMonth(review.week_start)}</DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4">
            {review.decisions && (
              <section className="flex flex-col gap-1.5">
                <h3 className="text-sm font-bold text-muted-foreground">Questa settimana</h3>
                <Text text={review.decisions} />
              </section>
            )}
            {review.summary && (
              <section className="flex flex-col gap-1.5">
                <h3 className="text-sm font-bold text-muted-foreground">La settimana scorsa</h3>
                <Text text={review.summary} />
              </section>
            )}
          </div>
          <DrawerFooter>
            <Button variant="outline" className="h-11 rounded-full" onClick={() => onOpenChange(false)}>
              Chiudi
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// The coach's note for this week, on Today. New: a card with the decisions, until
// "Ok, letto". Then one quiet row that opens it.
export function CoachNote({ review }: { review: Review }) {
  const key = `coach-note-read:${review.id}`
  const [read, setRead] = useState(() => getPref(key) === '1')
  const [open, setOpen] = useState(false)
  const lead = review.decisions || review.summary

  if (read)
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="row min-h-12 justify-start gap-3 px-4"
        >
          <MessageSquareTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="flex-1 text-sm">Nota del coach per questa settimana</span>
          <RowArrow />
        </button>
        <CoachNoteSheet review={review} open={open} onOpenChange={setOpen} />
      </>
    )

  return (
    <div className="feature animate-fade-in flex-col justify-start gap-2 text-card">
      <div className="flex items-center gap-2 pr-16 text-sm font-bold">
        <MessageSquareTextIcon className="size-4" aria-hidden />
        Dal tuo coach · settimana del {dayMonth(review.week_start)}
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed">{lead}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="h-11 px-4" onClick={() => setOpen(true)}>
          Leggi tutto
        </Button>
        <Button
          variant="outline"
          className="h-11 rounded-full px-5"
          onClick={() => {
            setPref(key, '1')
            setRead(true)
          }}
        >
          Ok, letto
        </Button>
      </div>
      <CoachNoteSheet review={review} open={open} onOpenChange={setOpen} />
    </div>
  )
}
