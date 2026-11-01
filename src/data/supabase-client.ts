import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Both values are public by design: the publishable key only lets the browser
// talk to Supabase. What protects the data is login + Row Level Security.
// Never put the secret (service_role) key here or anywhere in this repo.
export const SUPABASE_URL = 'https://swubnxbzjqjeuiwlauwi.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_t_sNt_oINdHi5pEedbgzsQ_Qq3wknPN'

// Gemeas has its own tables, in the `gemeas` schema: it never reads or writes any other app's
export const supabase = createClient<Database, 'gemeas'>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { db: { schema: 'gemeas' } })
