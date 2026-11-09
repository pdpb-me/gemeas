# The Coach tab in Gemeas: what was built, and how to copy it to Pisada

A recap for a new Claude Code chat in the Pisada repo. Gemeas started as a copy of Pisada, so most of the app code (React + Vite + TypeScript + Tailwind + shadcn, the `Backend` interface, the demo) has the same shape there. The source of truth is the Gemeas repo: read the files named below rather than this summary when copying.

## What it is

A third tab, **Coach**, shown only to a person whose coach profile is `enabled`. She writes in Italian; a coach (Claude, through the Claude API) answers in a few sentences. The coach can **read** her plan, logs, morning answers, activities, tests, weekly notes and video list, but **never her weight**. It **never writes to the plan**: it makes a **proposal**, shown as a card with **Applica** and **No**. Only Applica changes the plan, all or nothing, with her own login.

The demo has the same tab with ready-written answers (no API, no cost).

## How it was built, step by step (Gemeas commits)

1. `8e7390e` **Demo first.** The Coach tab, the chat screen and the `Backend` methods, with written answers in the demo. This fixed the UI and the API shape before spending anything.
2. `23d34ff` **Real chat.** Tables, the server function calling the Claude API, streaming replies, daily limit, one reply at a time, tests.
3. `c6f8fb9` **Proposals.** The `propose_changes` tool, the `plan_proposals` table, the `decide_proposal` SQL function, the card with Applica / No (also in the demo).
4. `f910249`, `50390e8` **Rules for proposals.** Every new session needs a video or drawn figures (except trainer / walk / run / cycle); a pill always has figures; the card says which video and figures she is accepting.
5. `6c28ac1` **Model and style.** `claude-opus-5-5`, a warm style inspired by Coach Lasso (no catchphrases, rules first).
6. `df6a595`, `7501bdb`, `c5afb73` **iPhone fixes.** The last message no longer hides under the text box; the draft and the reply survive switching tabs.
7. `9dc14df` **Safety fix.** Applica no longer changes a session she logged after the proposal was made: the proposal becomes `stale`.

## The pieces

### Database (migrations in `supabase/migrations/`)

- `…_gemeas_coach_chat.sql`
  - `coach_profiles`: one row per person. `enabled` (off by default), `daily_limit` (messages per 24 h, default 20), `instructions` (**private**: who she is, for the coach; never in the repo), `reply_started_at` (a lock: one reply at a time).
  - `chat_threads`: one conversation. `fingerprint` = hash of model + system prompt + tools; `closed` after an error.
  - `chat_messages`: every turn sent to the API. `content` is **`json`, not `jsonb`**, so it goes back to the API byte for byte. `text` is what the app shows (null for tool calls and failed messages). Token counts per row.
  - RLS on, own rows only. The app can **select only** (and only some columns: not `instructions`, not `content`). Only the server function (service role) writes.
- `…_gemeas_plan_proposals.sql`
  - `plan_proposals`: `summary`, `lines` (what the card shows), `changes` (each change with a `before` copy of the row), `status` = `pending | applied | declined | stale | replaced`.
  - `decide_proposal(p_id, p_apply)`: `security invoker` (runs as her, RLS applies). First checks **every** change (row still exactly as `before`, videos exist, no log on a removed session); if anything differs → `stale`, nothing applied. Then applies all. Logged symptoms and tests move with a moved session.
- `…_gemeas_people.sql`: per-person `tracks_foot` and `videos_from` (Gemeas-specific; probably not needed in Pisada).
- `…_gemeas_proposal_after_log.sql`: `decide_proposal` again, with one more check (a session logged after the proposal → `stale`).

### Server function `supabase/functions/gemeas-coach-chat/index.ts`

- Checks the login, then `coach_profiles.enabled` (**logins are shared with other apps in the project, so this is the gate that stops anyone else spending the API key**), message length (max 2000), the daily limit, then takes the lock with one atomic `update … where reply_started_at is null or stale`.
- Two Supabase clients: **service role** only for the chat tables; **her own token** (`Reader`) for reading her data, so RLS protects it.
- Starts a **new thread** after 24 h of silence, after an error, or when the fingerprint changes. The new thread gets the last 10 visible messages as context inside the first user message.
- Each user message starts with the date and time in Europe/Rome (app day starts at 04:00) and what she decided on earlier proposals. **These go in the user message, never in the system prompt**, so the prompt cache keeps working.
- Calls `client.beta.messages.stream` with `model`, `effort: 'low'`, prompt caching, server-side fallback, tools; up to 5 tool rounds, then `tool_choice: none` so it must answer.
- Streams to the app as **NDJSON**: `{d: "more text"}`, `{reset: true}` (new round), `{done: true}`, `{error: "…"}`. Runs inside `EdgeRuntime.waitUntil`, so the reply is saved even if she closes the app.
- On a refusal or error: shows a fixed Italian message, closes the thread, puts her message back in her box. Logs never contain what she wrote.
- Secret: `GEMEAS_ANTHROPIC_KEY` (Supabase → Edge Functions → Secrets).

### Shared module `supabase/functions/_shared/coach.ts`

No Node/Deno APIs, so Vitest can test it. Holds:

- `MODEL`, limits, the **guide** (system prompt, in English, telling it to write simple Italian with "tu", short, plain text, calm; pain in words never numbers; not a doctor; no weight; how the plan is built).
- `systemPrompt(instructions)`: the guide + "About this person" from the database.
- `TOOLS`: `get_plan`, `get_morning_answers`, `get_activities`, `get_tests`, `get_coach_notes`, `search_videos` (read), and `propose_changes` (the only "write", and it only saves a proposal).
- `runTool`: each reader selects **only the listed columns** (no weight, no raw Garmin answer), max 56 days, errors kept out of the chat.
- `prepareProposal`: validates every change (dates not in the past, slot am/pm, known exercise slugs, video ids from her list, no removing logged sessions, no duplicates, max 30 changes, something to follow) and returns problems **to the coach** so it fixes and proposes again. Writes the `lines` for the card and a `before` copy for `decide_proposal`.
- `needsNewThread`, `appMoment`, `userBlocks`, `visibleText`, `decisionNotes`.

### App

- `src/App.tsx`: the Coach tab, filtered by `useCoachAvailable()`.
- `src/components/coach-chat.tsx`: bubbles, day separators, suggestion buttons when empty, the proposal card, "Il coach sta scrivendo…", error banner, auto-growing text box sticky above the tab bar. The draft and the in-flight reply live **outside React state** (module store + `useSyncExternalStore`) so they survive switching tabs.
- `src/lib/chat-items.ts`: puts each proposal card under the coach reply that follows it.
- `src/data/api.ts` (+ `supabase.ts`, `store.ts`, `hooks/use-data.ts`, `types.ts`, `rules.ts`): `coachAvailable`, `chatMessages`, `chatProposals`, `sendChat(text, onReply)`, `decideProposal(id, apply)`, `CHAT_MAX_CHARS`. `sendChat` reads the NDJSON stream; if the connection drops it checks every 3 s (20 times) whether the reply got saved.
- `src/lib/database.types.ts`: updated **by hand** (the generator only covers `public`).

### Demo

`src/demo/coach-replies.ts` picks a written answer from words in the message, filled with the demo's made-up data, following the same rules; it can make a proposal the demo applies. `?chatfail=load` / `send` shows the error states.

### Tests

- `src/lib/coach-function.test.ts`: never reads weight or another schema, no writing tool, pain as words, proposal validation, card lines, new-thread rules, date and summer time, the exercise slugs match `src/exercises/catalog.ts`, the max length matches the app.
- `src/demo/coach-replies.test.ts`: the demo coach follows the same rules.

## Copying it to Pisada: what changes

Pisada lives in the **`public` schema** of the **same Supabase project** (`swubnxbzjqjeuiwlauwi`). The shared-database rules from the Gemeas `CLAUDE.md` apply from the other side:

- **Only touch Pisada's tables.** Never read or change `gemeas` or `planejador`.
- **One chat at a time changes the database.** Don't run database work in Gemeas and Pisada at the same time.
- **Backup before every change.**
- **Names are project-wide**: migration names, server function names and secrets share one list. Use a Pisada prefix (e.g. `pisada_…` migrations, `pisada-coach-chat` function). The Anthropic key can be a new secret (`PISADA_ANTHROPIC_KEY`) or the same key; a separate one makes costs easy to tell apart.
- **Logins are shared**: the `enabled` check in the server function is essential, or any login in the project could use the chat.
- Pisada's own "Sync now" intervals.icu key rule still holds.

What to rewrite, not copy:

1. **The coach's guide** (`GUIDE`): Pisada's sport, words, session kinds and rules. Keep the general parts (short, calm, Italian, not a doctor, never writes without Applica, pain as words if Pisada has pain).
2. **The tools and readers**: one per Pisada table the coach should see, selecting only safe columns. Decide what stays out (as weight does in Gemeas).
3. **`propose_changes` / `prepareProposal` / `decide_proposal`**: match Pisada's plan table and its columns. Keep the pattern: `before` copy, check all then apply all, `stale` if anything changed, `security invoker`.
4. **The exercise/video checks** only if Pisada has them.
5. **The demo answers**: from Pisada's made-up data.

What can be copied almost as is: the chat tables and their RLS (with Pisada names), the server function's skeleton (auth, gate, limit, lock, threads, streaming, error handling), `coach-chat.tsx`, `chat-items.ts`, the `Backend` methods and `sendChat`'s stream reading, and the conversation tests.

Suggested order, as in Gemeas: demo tab first → tables + server function (read-only tools) → proposals → rules and style → test on the iPhone.

## Lessons worth keeping

- Never edit a saved conversation's rows or the prompt for an open thread: the API needs them exactly as they were. Changing the guide or tools starts a new thread by itself (fingerprint).
- Keep the date and anything that changes out of the system prompt (cache).
- A tool call and its result are saved together, or not at all.
- Proposal problems go back to the coach, not to her.
- Server functions are **not deployed by a push**: deploy through the Supabase connection, with `_shared/` next to `index.ts`.
- After a schema change: update the types by hand, run the advisors, update the coach's guide.
