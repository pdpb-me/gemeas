# Gemeas: notes for Claude Code

Personal training log PWA, in Italian, on iPhone (Safari, Add to Home Screen). Copied from the sister app Pisada and made its own. Two tabs: **Oggi** (morning check-in, the coach's note, the day's plan, walks) and **Progressi** (Panoramica | Attività). The demo has a third, **Esercizi**: a list of public YouTube videos. Built so a second person can join later with her own login and plan, on the same tables.

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

A third app, `planejador`, has its own schema in the same project and is not exposed: never read or change it, and keep it out of the exposed list.

After a schema change: update `src/lib/database.types.ts` by hand and check it against the database (the generator in the Supabase connection only covers `public`), run the advisors, and update the coach's guide. Every table: `user_id default auth.uid()` + RLS "own rows only". Never put a secret key in the repo.

## Commands

- `npm run dev:demo`: the demo (made-up data, no login, no Supabase), http://localhost:5173/gemeas/demo/. Use this one for testing
- `npm run dev`: the real app. It needs the `gemeas` schema and a login
- `npm run build`: type-check, build the app into `dist/` and the demo into `dist/demo/`
- `npm test`: Vitest. `npm run lint`: oxlint. `npm run preview`: serve the build
- `node scripts/demo-shots.mjs <folder>`: screenshots at 360 × 800 (after build + preview; needs Playwright)
- `node scripts/youtube-dataset.mjs` and `node scripts/videos-to-sql.mjs`: a channel's video list into `.xlsx`, then SQL for `gemeas.videos` (usage at the top of each). Keep the key, the datasets and the SQL outside the repo
- Deploy: push to `main`; GitHub Actions lints, tests, builds and publishes to https://pdpb-me.github.io/gemeas/ (demo: /gemeas/demo/)

## Structure

Vite + React 19 + TypeScript + Tailwind 4 + shadcn/ui, Supabase.

- `src/components/`: screens and cards. `today.tsx` → `check-ins.tsx`, `coach-note.tsx`, `plan-list.tsx`, `walks.tsx` → `session-screen.tsx` → `exercise-screen.tsx`. `progress.tsx` → `pain-detail.tsx`, `weight-detail.tsx`, `activities-list.tsx`. `coach-chat.tsx`: the chat with the coach. Sheets: `log-sheet.tsx`, `move-sheet.tsx`, `test-card.tsx`
- `src/data/`: **the only way to the data.** `api.ts` (the `Backend` interface), `supabase.ts` (real, schema `gemeas`), `rules.ts` (row rules for both backends), `store.ts`, `use-query.ts`
- `src/demo/`: `simulate.ts` (seeded 12 made-up weeks), `scenarios.ts`, `state.ts`, `memory.ts`, `demo-bar.tsx`, `coach-replies.ts` (the chat's written answers and proposals), `library.tsx` + `video-data.ts` (Esercizi: a hand-picked sample; the full datasets stay out of the repo). Open a moment with `?scenario=<id>`; `&bar=0` hides the strip; `?chatfail=load` or `send` shows the chat's errors
- `src/lib/`: pure logic with tests. `src/exercises/`: the foot and calf figures (keep pose numbers as they are)

## Data words

- Session kinds (free text from the coach, lower case): `trainer`, `strength`, `mobility`, `foot`, `pill`, `test`, `walk`, `run`, `cycle`. `position` orders a pill before or after a workout in the same slot. Pills count like the other sessions: in the week's dots and counts too.
- `session_logs.effort`: `light`, `medium`, `hard`, asked after `trainer` sessions.
- Per person, in `gemeas.coach_profiles`: `tracks_foot` (off: no foot question, no foot on Progressi; the demo shows it with `?foot=0`) and `videos_from` (she reads that person's video list too, and can't change it). Only an admin sets them.
- Foot: `body_area 'foot'`, `side 'R'`, in one place (`FOOT` in `rules.ts`). Morning answer: `timing 'next_morning'`. Pain: 5 words stored as 0/2/5/8/10 (Nessuno, Lieve, Medio, Forte, Massimo).
- Progressi → Attività shows the watch's activities plus the sessions logged as done or in part (`lib/history.ts`); a session the watch also recorded that day shows once, with the watch's numbers. Pills show too. `session_logs.minutes`: asked after a walk, run or ride.
- Activities: `sport 'walk'` and others. `source 'manual'` is only in old rows and the demo (the app no longer has a button to add one); `source 'garmin'` comes from the watch through the server function `gemeas-garmin-sync` (Garmin's Personal API, one key per person in the Supabase secret `GEMEAS_GARMIN_KEYS`; keys expire, at most after a year). It runs when the app opens, at most once an hour, and every night from `.github/workflows/garmin-sync.yml`. Never store Garmin's whole answer: it holds the owner's name and GPS points.
- Coach chat: the server function `gemeas-coach-chat` calls the Claude API with the owner's key (Supabase secret `GEMEAS_ANTHROPIC_KEY`). Its guide and tools are in `supabase/functions/_shared/coach.ts`; a person has the chat only with `enabled` in `gemeas.coach_profiles`, whose `instructions` hold what's private. The coach reads with that person's login, and never the weight. It never writes to the plan: `propose_changes` saves a row in `gemeas.plan_proposals`, and the plan or the weekly note changes only when she taps Applica, through the SQL function `gemeas.decide_proposal` (her login, all or nothing; if anything changed in the meantime, nothing is applied and the status is `stale`). The exercise slugs in `_shared/coach.ts` must match `src/exercises/catalog.ts` (a test checks). `chat_messages.content` goes back to the API exactly as it came: never edit a conversation's rows or its prompt; start a new conversation instead (changing the guide or tools does it by itself).
- Server functions are not deployed by a push: deploy them through the Supabase connection, with `_shared/` next to `source/index.ts`.

## Design rules

All UI in this project uses the neo-brutalist design system: read `design/neo-brutalist-dls/DESIGN.md`, `dls.css` and `reference.html` first.

shadcn components stay, restyled; `src/index.css` imports `dls.css` and maps shadcn's colour names onto its tokens (the DLS `--muted` is shadcn's `muted-foreground`). The fonts are self-hosted with Fontsource, not loaded from Google. Sage, mustard and black mean pain low, medium and high, and nothing else; session status (done, partly, skipped) reads by shape, in ink. Tap targets ≥ 44 px; check at 360 px wide. The twin dachshunds (`src/lib/dachshunds.ts`, `components/dachshunds.tsx`) are decoration for calm moments only: never next to a sore foot (Medio or worse) or the weight, and they never replace the exercise figures. Their browns are the one colour outside the DLS. Calm, not gamified: no streaks, no weight goal, no comment on weight going up or down. Pain colour always comes with its word. No sheet opens by itself. Every screen that loads has a skeleton, an error card and an empty state.

## Gotchas

- Manifest `"id": "/gemeas/"`: every app on this github.io site needs its own.
- The demo is never installable and shares `localStorage` with the real app, so its keys start with `gemeas-demo:`. Only made-up data in the demo.
- Real-app code never imports from `src/demo/`; demo code never from `src/data/supabase*`.
