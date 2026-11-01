import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SendIcon } from 'lucide-react'
import { CardSkeleton, EmptyNote, ErrorCard } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DemoCoachNotice } from '@/data/backend'
import { CHAT_MAX_CHARS, LIMITS } from '@/data/rules'
import { sendChat } from '@/data/store'
import type { ChatMessage } from '@/data/types'
import { useChatMessages } from '@/hooks/use-data'
import { useToday } from '@/lib/clock'
import { appDay } from '@/lib/dates'
import { relativeDay } from '@/lib/format'
import { cn } from '@/lib/utils'

const SUGGESTIONS = ['Cosa faccio oggi?', 'Come sta andando il piede?', 'Quante camminate ho fatto?']
const TALLEST_BOX = 160 // px; a longer message scrolls inside the box
const NEAR_END = 120 // px

// What she was writing stays when she looks at another tab
const kept = { draft: '' }

function Bubble({ role, children }: { role: ChatMessage['role']; children: string }) {
  return (
    <p
      className={cn(
        'max-w-[88%] rounded-[10px] border-2 border-foreground px-3.5 py-2.5 wrap-anywhere whitespace-pre-wrap',
        role === 'user' ? 'self-end bg-foreground text-card' : 'self-start bg-card',
      )}
    >
      {children}
    </p>
  )
}

// The chat with the coach. Saved messages come from the backend; the one being sent and
// its reply show here until they are saved. The box stays above the tab bar, in the flow
// of the page, so the phone's keyboard can push it up by itself.
export function CoachChat() {
  const today = useToday()
  const messages = useChatMessages()
  const [text, setText] = useState(kept.draft)
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [pending, setPending] = useState<{ text: string; reply: string; lastId?: string } | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const followEnd = useRef(true)

  const saved = messages.data
  // stays until the saved messages include this exchange, so nothing flashes away
  const last = saved?.at(-1)
  const showPending = pending && !(last && last.id !== pending.lastId && last.role === 'coach')

  useEffect(() => {
    kept.draft = text
  }, [text])

  // Grows with the text (not every Safari can do it with CSS alone)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, TALLEST_BOX)}px`
  }, [text, saved])

  // Reading older messages: a new word shouldn't pull her back to the end
  useEffect(() => {
    const onScroll = () => {
      followEnd.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - NEAR_END
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    if (followEnd.current) window.scrollTo(0, document.documentElement.scrollHeight)
  }, [saved?.length, pending?.reply, failed])

  const send = async () => {
    const message = text.trim()
    if (sending || !LIMITS.chat(message)) return
    setText('')
    setFailed(null)
    setSending(true)
    followEnd.current = true
    setPending({ text: message, reply: '', lastId: last?.id })
    const problem = await sendChat(message, (reply) => setPending((p) => p && { ...p, reply }))
    setSending(false)
    if (problem) {
      setPending(null)
      setFailed(problem)
      // nothing she wrote is lost, unless she has started another message
      setText(kept.draft || message)
    }
  }

  return (
    // -mb-4: the box sits right on the tab bar, inside the room App keeps for it
    <main className="mx-auto -mb-4 flex min-h-[calc(100svh-4rem)] max-w-md flex-col">
      <header className="border-b bg-card px-4 pt-4 pb-3">
        <h1 className="text-display font-bold">Coach</h1>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-4" role="log" aria-label="Messaggi" aria-busy={sending}>
        {DemoCoachNotice && <p className="banner">{DemoCoachNotice}</p>}
        {messages.error && !saved && <ErrorCard what="la chat" onRetry={messages.retry} />}
        {!messages.error && !saved && <CardSkeleton />}
        {saved?.length === 0 && !showPending && (
          <EmptyNote title="Scrivi al tuo coach">
            Può guardare il tuo piano e i tuoi dati, ma per ora non può cambiare il piano.
          </EmptyNote>
        )}
        {saved?.length === 0 && !showPending && (
          <div className="flex flex-col items-start gap-2">
            {SUGGESTIONS.map((s) => (
              <Button key={s} variant="outline" className="h-11 px-4" onClick={() => setText(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}
        {saved?.map((m, i) => {
          const day = appDay(new Date(m.created_at))
          const newDay = i === 0 || appDay(new Date(saved[i - 1].created_at)) !== day
          return (
            <div key={m.id} className="flex flex-col gap-3">
              {newDay && <span className="self-center font-mono text-xs text-muted-foreground">{relativeDay(day, today)}</span>}
              <Bubble role={m.role}>{m.text}</Bubble>
            </div>
          )
        })}
        {showPending && (
          <>
            <Bubble role="user">{pending.text}</Bubble>
            {pending.reply ? <Bubble role="coach">{pending.reply}</Bubble> : <span className="self-start text-sm text-muted-foreground">Il coach sta scrivendo…</span>}
          </>
        )}
        {failed && (
          <p className="banner" role="alert">
            {failed}
          </p>
        )}
      </div>

      <form
        className="sticky bottom-[calc(66px+env(safe-area-inset-bottom))] z-10 flex items-end gap-2 border-t bg-background px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <Textarea
          ref={box}
          rows={1}
          value={text}
          maxLength={CHAT_MAX_CHARS}
          onChange={(e) => setText(e.target.value)}
          placeholder="Scrivi al coach…"
          aria-label="Messaggio al coach"
          className="min-h-11 resize-none md:text-base"
        />
        <Button type="submit" className="size-11 shrink-0 rounded-full p-0" disabled={sending || !LIMITS.chat(text)} aria-label="Invia">
          <SendIcon />
        </Button>
      </form>
    </main>
  )
}
