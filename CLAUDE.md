# Gemeas: notes for Claude Code

Personal training log PWA, in Italian, on iPhone (Safari, Add to Home Screen). Copied from the sister app Pisada and made its own. Two tabs: **Oggi** (morning check-in, the coach's note, the day's plan, walks) and **Progressi** (Panoramica | Attività). Built so a second person can join later with her own login and plan, on the same tables.

**This repo is public.** No real names (users, the personal trainer), health details, plans or notes in code, tests, comments or commit messages. They belong only in the database. In code the trainer is the kind `trainer`, shown as "Personal trainer". Private context lives in Claude's memory for this folder.

## How the owner likes to work

- New to software: work **step by step**, explain in plain words, ask before the next step. He writes in Italian here: answer in simple Italian.
- **Ask** when unclear, and **propose better options** with a short reason.
- Work laptop, no admin rights; don't work around IT policy. Keep projects off OneDrive. `gh` is at `C:\Program Files\GitHub CLI\gh.exe`.
- **Pushing changes the live app.** Small things (notes, wording, small fixes that don't change how data is saved): push directly. Everything else (features, database changes): ask "OK to push?" first. After every push, watch the deploy and report.

## The shared database: read before any database work

Gemeas and Pisada share **one Supabase project** (`swubnxbzjqjeuiwlauwi`). Gemeas uses the `gemeas` schema; Pisada uses `public`. The Supabase connection can reach both, so these rules are what protect Pisada:

1. **Only touch the `gemeas` schema.** Every SQL statement names `gemeas.` explicitly. Never read or write `public`.
2. **One chat at a time changes the database.** Code can move in parallel; database changes can't. If another chat may be changing it, stop and ask.
3. **Backup before every change.** Don't count on automatic backups on the free plan.
4. **Migration names start with `gemeas_`.** Supabase keeps one list for the whole project. The files live in this repo, in `supabase/migrations/`.
5. **Shared parts need the owner's OK, and a check of Pisada right after:**
   - the exposed schemas list (adding `gemeas` must keep `public`, or Pisada stops working)
   - logins and users
   - the login email's text (it must name neither app)
   - the free plan's storage limit
   - server functions (Pisada's "Sync now" uses one intervals.icu key: restrict it to its owner before any other login exists)

After a schema change: regenerate `src/lib/database.types.ts` (written by hand until the schema exists; check the generator can do the `gemeas` schema), run the advisors, and update the coach's guide. Every table: `user_id default auth.uid()` + RLS "own rows only". Never put a secret key in the repo.

## Commands

- `npm run dev:demo`: the demo (made-up data, no login, no Supabase), http://localhost:5173/gemeas/demo/. Use this one for testing
- `npm run dev`: the real app. It needs the `gemeas` schema and a login
- `npm run build`: type-check, build the app into `dist/` and the demo into `dist/demo/`
- `npm test`: Vitest. `npm run lint`: oxlint. `npm run preview`: serve the build
- `node scripts/demo-shots.mjs <folder>`: screenshots at 360 × 800 (after build + preview; needs Playwright)
- Deploy: push to `main`; GitHub Actions lints, tests, builds and publishes to https://pdpb-me.github.io/gemeas/ (demo: /gemeas/demo/)

## Structure

Vite + React 19 + TypeScript + Tailwind 4 + shadcn/ui, Supabase.

- `src/components/`: screens and cards. `today.tsx` → `check-ins.tsx`, `coach-note.tsx`, `plan-list.tsx`, `walks.tsx` → `session-screen.tsx` → `exercise-screen.tsx`. `progress.tsx` → `pain-detail.tsx`, `weight-detail.tsx`, `activities-list.tsx`. Sheets: `log-sheet.tsx`, `move-sheet.tsx`, `test-card.tsx`
- `src/data/`: **the only way to the data.** `api.ts` (the `Backend` interface), `supabase.ts` (real, schema `gemeas`), `rules.ts` (row rules for both backends), `store.ts`, `use-query.ts`
- `src/demo/`: `simulate.ts` (seeded 12 made-up weeks), `scenarios.ts`, `state.ts`, `memory.ts`, `demo-bar.tsx`. Open a moment with `?scenario=<id>`; `&bar=0` hides the strip
- `src/lib/`: pure logic with tests. `src/exercises/`: the foot and calf figures (keep pose numbers as they are)

## Data words

- Session kinds (free text from the coach, lower case): `trainer`, `strength`, `mobility`, `foot`, `pill`, `test`. `position` orders a pill before or after a workout in the same slot. Pills stay out of the week's dots and counts.
- `session_logs.effort`: `light`, `medium`, `hard`, asked after `trainer` sessions.
- Foot: `body_area 'foot'`, `side 'R'`, in one place (`FOOT` in `rules.ts`), so it can become per person. Morning answer: `timing 'next_morning'`. Pain: 5 words stored as 0/2/5/8/10 (Nessuno, Lieve, Medio, Forte, Massimo).
- Walks: `activities` with `sport 'walk'`, `source 'manual'`.

## Design rules

shadcn first; tokens in `src/index.css`. Blue only for the main action, "done" and links. Tap targets ≥ 44 px; check at 360 px wide. Calm, not gamified: no streaks, no weight goal, no comment on weight going up or down. Pain colour always comes with its word. No sheet opens by itself. Every screen that loads has a skeleton, an error card and an empty state.

## Gotchas

- Manifest `"id": "/gemeas/"`: every app on this github.io site needs its own.
- The demo is never installable and shares `localStorage` with the real app, so its keys start with `gemeas-demo:`. Only made-up data in the demo.
- Real-app code never imports from `src/demo/`; demo code never from `src/data/supabase*`.
