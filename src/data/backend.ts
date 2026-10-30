// Which backend the app uses. The demo build (`vite --mode demo`) swaps this file for
// src/demo/backend.ts (see vite.config.ts): the real app never ships demo data, and the
// demo never ships or calls Supabase.
export { backend } from '@/data/supabase'

// The demo's control bar; the real app has none
export const DemoBar: React.ComponentType | null = null
