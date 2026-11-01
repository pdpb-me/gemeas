// The chat with the coach: saves her message, asks Claude, and sends the reply back a piece
// at a time as lines of JSON. Everything is saved here, so a reply is there when she reopens
// the app even if the connection dropped. Logs never hold what she wrote.
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   GEMEAS_ANTHROPIC_KEY: the key from the Claude Console
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { appMoment, MAX_CHARS, MAX_TOOL_ROUNDS, MODEL, needsNewThread, runTool, systemPrompt, TOOLS, userBlocks, visibleText, type Reader } from '../_shared/coach.ts'

declare const EdgeRuntime: { waitUntil(work: Promise<unknown>): void }

const MAX_TOKENS = 4000
const RECENT_MESSAGES = 10
const LIMIT_WINDOW_MS = 24 * 3600_000
const STALE_REPLY_MS = 3 * 60_000 // past the function's own time limit: that reply is dead

const FAILED = 'Il coach non risponde adesso. Riprova tra poco.'
const REFUSED = 'Su questo non riesco a risponderti. Puoi chiedere a chi gestisce l’app.'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const URL_ = Deno.env.get('SUPABASE_URL')!
const PUBLIC_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}').default

// Only the chat's own tables are written with this one; her data is read with her login
const db = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  db: { schema: 'gemeas' },
  auth: { persistSession: false },
})

async function sha256(text: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(error.message)
  return data
}

type Send = (message: Record<string, unknown>) => void

async function reply(userId: string, token: string, text: string, instructions: string, send: Send) {
  const client = new Anthropic({ apiKey: Deno.env.get('GEMEAS_ANTHROPIC_KEY'), maxRetries: 1 })
  const reader = createClient(URL_, PUBLIC_KEY, {
    db: { schema: 'gemeas' },
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  }) as unknown as Reader

  const system = systemPrompt(instructions)
  const fingerprint = await sha256(JSON.stringify([MODEL, system, TOOLS]))

  const latest = check(await db.from('chat_threads').select('id, fingerprint, closed').eq('user_id', userId).order('created_at', { ascending: false }).limit(1))[0] ?? null
  const history = latest
    ? check(await db.from('chat_messages').select('role, content, created_at').eq('thread_id', latest.id).order('seq'))
    : []

  let threadId = latest?.id as string | undefined
  let messages = history.map(({ role, content }) => ({ role, content }))
  let recent: { role: string; text: string }[] = []
  if (needsNewThread(latest, history.at(-1)?.created_at ?? null, fingerprint)) {
    recent = check(await db.from('chat_messages').select('role, text').eq('user_id', userId).not('text', 'is', null).order('seq', { ascending: false }).limit(RECENT_MESSAGES)).reverse() as typeof recent
    threadId = check(await db.from('chat_threads').insert({ fingerprint, user_id: userId }).select('id').single()).id
    messages = []
  }

  const row = { thread_id: threadId, user_id: userId }
  const content = userBlocks(text, appMoment().label, recent)
  const asked = check(await db.from('chat_messages').insert({ ...row, role: 'user', text, content }).select('id').single())
  messages.push({ role: 'user', content })

  try {
    for (let round = 0; ; round++) {
      if (round > 0) send({ reset: true })
      const stream = client.beta.messages.stream(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'low' },
          cache_control: { type: 'ephemeral' },
          system,
          tools: TOOLS,
          // Enough looking up: it answers with what it has
          tool_choice: { type: round < MAX_TOOL_ROUNDS ? 'auto' : 'none' },
          messages,
        } as never,
        { timeout: 120_000 },
      )
      stream.on('text', (d: string) => send({ d }))
      const message = await stream.finalMessage()

      const usage = {
        model: message.model,
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        cache_read_tokens: message.usage.cache_read_input_tokens,
        cache_write_tokens: message.usage.cache_creation_input_tokens,
      }

      if (message.stop_reason === 'refusal') {
        // This turn can't be sent back to the API: the next message starts a new conversation
        check(await db.from('chat_messages').insert({ ...row, ...usage, role: 'assistant', text: REFUSED, content: [{ type: 'text', text: REFUSED }] }))
        check(await db.from('chat_threads').update({ closed: true }).eq('id', threadId))
        send({ reset: true })
        send({ d: REFUSED })
        break
      }

      if (message.stop_reason === 'tool_use') {
        const results = await Promise.all(
          message.content
            .filter((b: { type: string }) => b.type === 'tool_use')
            .map(async (b: { id: string; name: string; input: unknown }) => ({ type: 'tool_result', tool_use_id: b.id, ...(await runTool(b.name, b.input, reader)) })),
        )
        // Saved together: a look-up without its answer can't be sent back to the API
        check(
          await db.from('chat_messages').insert([
            { ...row, ...usage, role: 'assistant', content: message.content },
            { ...row, role: 'user', content: results },
          ]),
        )
        messages.push({ role: 'assistant', content: message.content }, { role: 'user', content: results })
        continue
      }

      const answer = visibleText(message.content)
      // Cut short in the middle of a look-up, or nothing to show
      if (!answer) throw new Error(`no answer, stopped by ${message.stop_reason}`)
      check(await db.from('chat_messages').insert({ ...row, ...usage, role: 'assistant', text: answer, content: message.content }))
      break
    }
    send({ done: true })
  } catch (e) {
    // Her message goes back to her box: it isn't shown, and the next one starts a new conversation
    await db.from('chat_messages').update({ text: null }).eq('id', asked.id)
    await db.from('chat_threads').update({ closed: true }).eq('id', threadId)
    throw e
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const { data: auth, error: authError } = await db.auth.getUser(token)
  if (authError || !auth.user) return json({ error: 'Non hai fatto il login' }, 401)
  const userId = auth.user.id

  // Logins are shared with other apps: only who has an enabled profile can spend on this
  const { data: profile, error: profileError } = await db.from('coach_profiles').select('enabled, daily_limit, instructions').eq('user_id', userId).maybeSingle()
  if (profileError) {
    console.error(profileError.message)
    return json({ error: FAILED }, 500)
  }
  if (!profile?.enabled) return json({ error: 'La chat con il coach non è attiva' }, 403)
  if (!Deno.env.get('GEMEAS_ANTHROPIC_KEY')) {
    console.error('GEMEAS_ANTHROPIC_KEY is not set')
    return json({ error: FAILED }, 500)
  }

  const text = await req
    .json()
    .then((body) => (typeof body?.text === 'string' ? body.text.trim() : ''))
    .catch(() => '')
  if (!text || text.length > MAX_CHARS) return json({ error: 'Messaggio non valido' }, 400)

  const since = new Date(Date.now() - LIMIT_WINDOW_MS).toISOString()
  const { count, error: countError } = await db
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .not('text', 'is', null)
    .gte('created_at', since)
  if (countError) {
    console.error(countError.message)
    return json({ error: FAILED }, 500)
  }
  if ((count ?? 0) >= profile.daily_limit) return json({ error: 'Per oggi hai scritto molti messaggi: riprova domani.' }, 429)

  // One reply at a time. The filter and the update are one step, so two taps can't both pass.
  const stale = new Date(Date.now() - STALE_REPLY_MS).toISOString()
  const { data: locked, error: lockError } = await db
    .from('coach_profiles')
    .update({ reply_started_at: new Date().toISOString() })
    .eq('user_id', userId)
    .or(`reply_started_at.is.null,reply_started_at.lt.${stale}`)
    .select('user_id')
  if (lockError) {
    console.error(lockError.message)
    return json({ error: FAILED }, 500)
  }
  if (!locked?.length) return json({ error: 'Il coach sta ancora rispondendo.' }, 409)

  const encoder = new TextEncoder()
  let out: ReadableStreamDefaultController<Uint8Array> | null = null
  const body = new ReadableStream<Uint8Array>({
    start: (controller) => {
      out = controller
    },
    // She left: the work goes on and is saved
    cancel: () => {
      out = null
    },
  })
  const send: Send = (message) => {
    try {
      out?.enqueue(encoder.encode(`${JSON.stringify(message)}\n`))
    } catch {
      out = null
    }
  }

  EdgeRuntime.waitUntil(
    reply(userId, token, text, profile.instructions, send)
      .catch((e) => {
        console.error(e instanceof Anthropic.APIError ? `Claude API: ${e.status}` : e instanceof Error ? e.message : 'failed')
        send({ error: FAILED })
      })
      .finally(async () => {
        await db.from('coach_profiles').update({ reply_started_at: null }).eq('user_id', userId)
        try {
          out?.close()
        } catch {
          // already closed
        }
      }),
  )

  return new Response(body, { headers: { ...cors, 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } })
})
