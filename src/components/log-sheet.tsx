import { useEffect, useRef, useState } from 'react'
import { useBackCloses } from '@/hooks/use-back-stack'
import { Choice, PainScale } from '@/components/pain-scale'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import type { DaySession, Effort, Status } from '@/data/types'
import { asksEffort, EFFORTS } from '@/lib/effort'
import type { PainArea } from '@/lib/pain-areas'
import { sessionPain, STATUSES } from '@/lib/session-status'

const NOTE_HINT: Record<string, string> = {
  trainer: 'es. tanti squat, gambe stanche',
  strength: 'es. elastico più duro sull’ultima serie',
  mobility: 'es. anche più sciolte',
  foot: 'es. destro instabile nell’ultima serie',
  pill: 'es. fatta di corsa',
}

// The details of a logged session, in one bottom sheet: status, how hard it was, pain during,
// a note. Taps save at once; the note saves when the sheet closes.
export function LogSheet({
  open,
  onOpenChange,
  ...props
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: DaySession
  onStatus: (status: Status | null) => Promise<boolean>
  onEffort: (effort: Effort | null) => void
  onPain: (area: PainArea, score: number | null) => void
  onComment: (comment: string) => Promise<boolean>
  onCleared: () => void
}) {
  useBackCloses(open, () => onOpenChange(false))
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>{open && <LogForm {...props} onClose={() => onOpenChange(false)} />}</DrawerContent>
    </Drawer>
  )
}

function LogForm({
  session,
  onStatus,
  onEffort,
  onPain,
  onComment,
  onCleared,
  onClose,
}: {
  session: DaySession
  onStatus: (status: Status | null) => Promise<boolean>
  onEffort: (effort: Effort | null) => void
  onPain: (area: PainArea, score: number | null) => void
  onComment: (comment: string) => Promise<boolean>
  onCleared: () => void
  onClose: () => void
}) {
  const saved = session.log?.comment ?? ''
  const [note, setNote] = useState(saved)
  const [noteOpen, setNoteOpen] = useState(saved !== '')
  const { area, score } = sessionPain(session)
  const happened = session.log?.status === 'done' || session.log?.status === 'partial'

  // The note saves when the form goes away, however the sheet was closed (Close, swipe,
  // tap outside, back gesture), unless the log was just cleared
  const latest = useRef({ note, saved, logged: !!session.log, onComment, cleared: false })
  useEffect(() => {
    latest.current = { ...latest.current, note, saved, logged: !!session.log, onComment }
  })
  useEffect(
    () => () => {
      const l = latest.current
      if (l.logged && !l.cleared && l.note.trim() !== l.saved) void l.onComment(l.note)
    },
    [],
  )
  const close = onClose

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-col">
      <DrawerHeader className="text-left">
        <DrawerTitle className="text-xl">{session.title}</DrawerTitle>
        <DrawerDescription>Com’è andata?</DrawerDescription>
      </DrawerHeader>

      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-4 pb-2">
        <Choice
          label="Quanto ne hai fatto"
          hideLabel
          options={STATUSES}
          value={(session.log?.status as Status | undefined) ?? null}
          onChange={(s) => void onStatus(s)}
        />

        {asksEffort(session.kind) && happened && (
          <Choice
            label="Quanto è stata dura?"
            options={EFFORTS}
            value={(session.log?.effort as Effort | null | undefined) ?? null}
            onChange={(e) => onEffort(e)}
          />
        )}

        {area && (
          <PainScale
            label={area.label}
            hint={happened ? undefined : 'dopo Fatto o In parte'}
            value={score}
            onChange={(s) => onPain(area, s)}
            disabled={!happened}
          />
        )}

        {session.log &&
          (noteOpen ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="log-note" className="text-sm font-medium">
                Nota <span className="font-normal text-muted-foreground">· facoltativa</span>
              </label>
              <Textarea
                id="log-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={NOTE_HINT[session.kind] ?? 'Qualcosa da ricordare'}
                rows={3}
              />
            </div>
          ) : (
            <Button variant="ghost" className="-mx-2 h-11 self-start px-2 text-primary" onClick={() => setNoteOpen(true)}>
              Aggiungi una nota
            </Button>
          ))}

        {session.log && (
          <Button
            variant="ghost"
            className="-mx-2 h-11 self-start px-2 text-muted-foreground"
            onClick={async () => {
              latest.current.cleared = true
              onClose()
              if (await onStatus(null)) onCleared()
            }}
          >
            Cancella questa registrazione
          </Button>
        )}
      </div>

      <DrawerFooter>
        <Button variant="outline" className="h-12 rounded-full text-base" onClick={close}>
          Chiudi
        </Button>
      </DrawerFooter>
    </div>
  )
}
