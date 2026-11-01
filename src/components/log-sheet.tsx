import { useEffect, useRef, useState } from 'react'
import { useBackCloses } from '@/hooks/use-back-stack'
import { Choice, PainScale } from '@/components/pain-scale'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LIMITS } from '@/data/rules'
import type { DaySession, Effort, Status } from '@/data/types'
import { asksEffort, EFFORTS } from '@/lib/effort'
import type { PainArea } from '@/lib/pain-areas'
import { sessionPain, STATUSES } from '@/lib/session-status'
import { asksMinutes } from '@/lib/session-time'

const NOTE_HINT: Record<string, string> = {
  trainer: 'es. tanti squat, gambe stanche',
  strength: 'es. elastico più duro sull’ultima serie',
  mobility: 'es. anche più sciolte',
  foot: 'es. destro instabile nell’ultima serie',
  pill: 'es. fatta di corsa',
}

// How long a walk, run or ride was. Saves when the box loses focus or the sheet closes;
// empty removes it.
function MinutesInput({ value, onSave }: { value: number | null; onSave: (minutes: number | null) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value?.toString() ?? '')
  const [invalid, setInvalid] = useState(false)

  function commit() {
    const text = draft.trim()
    setInvalid(false)
    if (text === (value?.toString() ?? '')) return
    if (text === '') return void onSave(null)
    const minutes = Math.round(Number(text.replace(',', '.')))
    if (!LIMITS.minutes(minutes)) return setInvalid(true)
    void onSave(minutes)
  }

  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })
  useEffect(() => () => commitRef.current(), [])

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="log-minutes" className="text-sm font-medium">
        Quanti minuti? <span className="font-medium text-muted-foreground">· facoltativo</span>
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="log-minutes"
          inputMode="numeric"
          placeholder="es. 30"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="h-11 max-w-32 text-base tabular-nums"
        />
        <span className="text-muted-foreground">min</span>
      </div>
      {invalid && <span className="text-xs font-medium text-destructive">Non salvato: da 1 a 600 minuti</span>}
    </div>
  )
}

// The details of a logged session, in one bottom sheet: status, how hard it was, minutes,
// pain during, a note. Taps save at once; the note saves when the sheet closes.
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
  onMinutes: (minutes: number | null) => Promise<boolean>
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
  onMinutes,
  onComment,
  onCleared,
  onClose,
}: {
  session: DaySession
  onStatus: (status: Status | null) => Promise<boolean>
  onEffort: (effort: Effort | null) => void
  onPain: (area: PainArea, score: number | null) => void
  onMinutes: (minutes: number | null) => Promise<boolean>
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
        <DrawerTitle className="text-h2">{session.title}</DrawerTitle>
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

        {asksMinutes(session.kind) && happened && <MinutesInput value={session.log?.minutes ?? null} onSave={onMinutes} />}

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
                Nota <span className="font-medium text-muted-foreground">· facoltativa</span>
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
