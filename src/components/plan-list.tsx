import { ChevronRightIcon } from 'lucide-react'
import { toast } from 'sonner'
import { LogSummary } from '@/components/log-summary'
import { StatusMark } from '@/components/status-mark'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { isPill } from '@/data/rules'
import type { DaySession, Status } from '@/data/types'
import { asksEffort } from '@/lib/effort'
import { plural } from '@/lib/format'
import { kindWord, sessionMeta, SLOT_WORD } from '@/lib/session-words'
import { sessionPain, STATUSES, statusLabel } from '@/lib/session-status'
import { testFor } from '@/lib/tests'
import { cn } from '@/lib/utils'

// One tap logs the status, with Undo. Tests need their numbers, so they open instead.
// A pill gets one button: it's only a few minutes, done or left out.
function QuickLog({
  session,
  onStatus,
  onOpen,
}: {
  session: DaySession
  onStatus: (s: Status | null) => Promise<boolean>
  onOpen: () => void
}) {
  if (testFor(session.exercises))
    return (
      <Button variant="outline" className="h-11 w-full rounded-lg" onClick={onOpen}>
        Inserisci i risultati
      </Button>
    )
  const log = async (status: Status) => {
    const ok = await onStatus(status)
    if (ok)
      toast(`${session.title}: ${statusLabel(status).toLowerCase()}`, {
        action: { label: 'Annulla', onClick: () => void onStatus(null) },
      })
  }
  if (isPill(session.kind))
    return (
      <Button variant="outline" className="h-11 w-full rounded-lg text-sm font-semibold" onClick={() => log('done')}>
        Fatta
      </Button>
    )
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Registra ${session.title}`}>
      {STATUSES.map((s) => (
        <Button
          key={s.value}
          variant="outline"
          className={cn('h-11 rounded-lg text-sm', s.value === 'done' && 'font-semibold')}
          onClick={() => log(s.value)}
        >
          {s.label}
        </Button>
      ))}
    </div>
  )
}

// A logged session that still has a question open: the row opens that question
const needsDetails = (s: DaySession) => {
  if (!s.log || s.log.status === 'skipped') return false
  const { area, score } = sessionPain(s)
  return (!!area && score == null) || (asksEffort(s.kind) && !s.log.effort)
}

// The day's plan: one row per session. A row opens the session; an unlogged row on today
// or a past day can be logged right here.
export function PlanList({
  sessions,
  date,
  today,
  onOpen,
  onStatus,
}: {
  sessions: DaySession[]
  date: string
  today: string
  onOpen: (id: string, openLog?: boolean) => void
  onStatus: (session: DaySession, status: Status | null) => Promise<boolean>
}) {
  const canLog = date <= today
  const past = date < today
  const open = sessions.filter((s) => !s.log)
  const count = (st: string) => sessions.filter((s) => s.log?.status === st).length
  const loggedText = [count('done') && `${count('done')} fatti`, count('partial') && `${count('partial')} in parte`, count('skipped') && `${count('skipped')} saltati`]
    .filter(Boolean)
    .join(' · ')

  async function skipRest() {
    const ids = open.map((s) => s.id)
    for (const s of open) await onStatus(s, 'skipped')
    toast(`${plural(ids.length, 'allenamento saltato', 'allenamenti saltati')}`, {
      action: { label: 'Annulla', onClick: () => void Promise.all(sessions.filter((s) => ids.includes(s.id)).map((s) => onStatus(s, null))) },
    })
  }

  return (
    <Card className="gap-0 py-1">
      <div className="flex min-h-12 items-center justify-between gap-2 pr-2 pl-4">
        <h2 className="text-base font-semibold">Piano</h2>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">
            {open.length === 0 ? loggedText : past ? `${open.length} da registrare` : `${open.length} da fare`}
          </span>
          {canLog && open.length >= 2 && (
            <Button variant="ghost" className="h-11 rounded-full px-3 text-sm text-muted-foreground" onClick={skipRest}>
              Salta tutti
            </Button>
          )}
        </div>
      </div>
      {sessions.map((s) => (
        <div key={s.id} className="flex flex-col gap-2 border-t px-4 py-3">
          <button
            type="button"
            onClick={() => onOpen(s.id, needsDetails(s))}
            className="-mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 text-left hover:bg-muted/60"
          >
            <StatusMark status={s.log?.status} past={past} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground">
                {SLOT_WORD[s.slot] ?? s.slot} · {kindWord(s.kind)}
              </span>
              <span className={cn('text-base font-semibold', s.log?.status === 'skipped' && 'text-muted-foreground')}>{s.title}</span>
              {s.log ? (
                <LogSummary session={s} compact />
              ) : (
                <span className="line-clamp-2 text-sm text-muted-foreground">{sessionMeta(s)}</span>
              )}
            </span>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
          {canLog && !s.log && <QuickLog session={s} onStatus={(st) => onStatus(s, st)} onOpen={() => onOpen(s.id)} />}
        </div>
      ))}
    </Card>
  )
}
