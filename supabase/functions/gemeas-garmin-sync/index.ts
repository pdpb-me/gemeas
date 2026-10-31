// Copies watch activities from Garmin's Personal API into `gemeas.activities`.
// Called by the app (with a login: that person only) and by the nightly GitHub Action
// (with the `x-sync-secret` header: everyone who has a key). It answers with totals only,
// because the Action's logs are public.
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   GEMEAS_GARMIN_KEYS: JSON, { "<user id>": "<that person's Garmin key>" }
//   GEMEAS_SYNC_SECRET: a long random text, the same as in GitHub
import { createClient } from 'npm:@supabase/supabase-js@2'
import { duplicateManualWalks, fetchActivities, lastDays, toRows } from '../_shared/garmin.ts'

const DAYS = 7
const FIRST_SYNC_DAYS = 28

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  db: { schema: 'gemeas' },
  auth: { persistSession: false },
})

async function syncUser(userId: string, apiKey: string) {
  const { data: synced, error: syncedError } = await db
    .from('activities')
    .select('id')
    .eq('user_id', userId)
    .eq('source', 'garmin')
    .limit(1)
  if (syncedError) throw new Error(syncedError.message)

  const range = lastDays(synced.length ? DAYS : FIRST_SYNC_DAYS)
  const rows = toRows(await fetchActivities(apiKey, range), userId)
  if (!rows.length) return { count: 0, removed: 0 }

  const { error } = await db.from('activities').upsert(rows, { onConflict: 'user_id,external_id' })
  if (error) throw new Error(error.message)

  const { data: manual, error: manualError } = await db
    .from('activities')
    .select('id, date, duration_s')
    .eq('user_id', userId)
    .eq('source', 'manual')
    .eq('sport', 'walk')
    .gte('date', range.startDate)
  if (manualError) throw new Error(manualError.message)

  const duplicates = duplicateManualWalks(rows, manual)
  if (duplicates.length) {
    const { error: deleteError } = await db.from('activities').delete().eq('user_id', userId).in('id', duplicates)
    if (deleteError) throw new Error(deleteError.message)
  }
  return { count: rows.length, removed: duplicates.length }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  let keys: Record<string, string>
  try {
    keys = JSON.parse(Deno.env.get('GEMEAS_GARMIN_KEYS') ?? '{}')
  } catch {
    console.error('GEMEAS_GARMIN_KEYS is not valid JSON')
    return json({ error: 'Sync is not set up correctly' }, 500)
  }

  const secret = Deno.env.get('GEMEAS_SYNC_SECRET')
  let users: string[]
  if (secret && req.headers.get('x-sync-secret') === secret) {
    users = Object.keys(keys)
  } else {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
    const { data: auth, error } = await db.auth.getUser(token)
    if (error || !auth.user) return json({ error: 'Not logged in' }, 401)
    users = keys[auth.user.id] ? [auth.user.id] : []
  }

  const total = { count: 0, removed: 0, failed: 0 }
  for (const userId of users) {
    try {
      const done = await syncUser(userId, keys[userId])
      total.count += done.count
      total.removed += done.removed
    } catch (e) {
      total.failed += 1
      console.error(e instanceof Error ? e.message : String(e))
    }
  }
  return json(total, total.failed ? 502 : 200)
})
