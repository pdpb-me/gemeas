import { describe, expect, it } from 'vitest'
import { CHAT_MAX_CHARS } from '@/data/rules'
import { EXERCISES as CATALOG } from '@/exercises/catalog'
import { PAIN_LEVELS, painLabel } from '@/lib/pain'
import { appMoment, decisionNotes, EXERCISES, linesOf, MAX_CHARS, needsNewThread, painWord, period, prepareProposal, runTool, systemPrompt, TOOLS, userBlocks, visibleText, type Change, type Reader } from '../../supabase/functions/_shared/coach.ts'

// A pretend database: remembers what was asked, and answers with the rows it was given
function fakeDb(rows: unknown[] = [], error: { message: string } | null = null) {
  const asked: { table: string; columns: string; calls: [string, unknown[]][] }[] = []
  const reader = {
    from(table: string) {
      return {
        select(columns: string) {
          const entry = { table, columns, calls: [] as [string, unknown[]][] }
          asked.push(entry)
          const query = new Proxy(
            {},
            {
              get(_, name: string) {
                if (name === 'then') return (done: (r: unknown) => void) => done({ data: rows, error })
                return (...args: unknown[]) => {
                  entry.calls.push([name, args])
                  return query
                }
              },
            },
          )
          return query
        },
      }
    },
  } as unknown as Reader
  return { reader, asked }
}

const WEEK = { from: '2026-11-02', to: '2026-11-08' }

describe('what the coach can read', () => {
  it('never reads the weight, a whole Garmin answer or another schema', async () => {
    const { reader, asked } = fakeDb()
    for (const tool of TOOLS) if (tool.name !== 'propose_changes') await runTool(tool.name, WEEK, reader)
    expect(asked.map((a) => a.table).sort()).toEqual(['activities', 'plan_sessions', 'reviews', 'symptoms', 'tests', 'videos'])
    for (const a of asked) {
      expect(a.table).not.toContain('.')
      expect(a.columns).not.toContain('*')
      expect(a.columns).not.toContain('raw')
    }
  })

  it('has no tool that writes: at most it proposes', () => {
    for (const tool of TOOLS) expect(tool.name).toMatch(/^(get|search|propose)_/)
  })

  it('gives pain as a word, the same words as the app', async () => {
    for (const { score } of PAIN_LEVELS) expect(painWord(score)).toBe(painLabel(score))
    for (const score of [1, 3, 4, 6, 7, 9]) expect(painWord(score)).toBe(painLabel(score))
    const { reader } = fakeDb([{ date: '2026-11-02', score: 5, body_area: 'foot', side: 'R' }])
    const { content } = await runTool('get_morning_answers', WEEK, reader)
    expect(JSON.parse(content)).toEqual([{ date: '2026-11-02', body_area: 'foot', side: 'R', word: 'Medio' }])
  })

  it('puts the log and its pain on the session, as a word', async () => {
    const { reader } = fakeDb([
      { date: '2026-11-02', title: 'Piede', session_logs: { status: 'done', effort: null, comment: 'ok', symptoms: [{ score: 2, timing: 'during', body_area: 'foot' }] } },
      { date: '2026-11-03', title: 'Forza', session_logs: null },
    ])
    const { content } = await runTool('get_plan', WEEK, reader)
    expect(JSON.parse(content)).toEqual([
      { date: '2026-11-02', title: 'Piede', log: { status: 'done', effort: null, note: 'ok', pain_during: [{ area: 'foot', word: 'Lieve' }] } },
      { date: '2026-11-03', title: 'Forza', log: null },
    ])
  })

  it('refuses a bad or too long period, and says why', async () => {
    expect(period(WEEK)).toEqual(WEEK)
    expect(() => period({ from: '2026-11-08', to: '2026-11-02' })).toThrow('after')
    expect(() => period({ from: '2026-01-01', to: '2026-11-02' })).toThrow('at most')
    const { reader, asked } = fakeDb()
    const { content, is_error } = await runTool('get_activities', { from: 'ieri', to: '2026-11-02' }, reader)
    expect(is_error).toBe(true)
    expect(content).toContain('YYYY-MM-DD')
    expect(asked).toHaveLength(0)
  })

  it('keeps a database error out of what the coach reads', async () => {
    const { reader } = fakeDb([], { message: 'segreto interno' })
    const { content, is_error } = await runTool('get_tests', {}, reader)
    expect(is_error).toBe(true)
    expect(content).not.toContain('segreto')
  })

  it('answers an unknown tool with an error', async () => {
    expect((await runTool('set_plan', {}, fakeDb().reader)).is_error).toBe(true)
  })

  it('searches videos with the wildcards of her text taken literally', async () => {
    const { reader, asked } = fakeDb()
    await runTool('search_videos', { tags: ['foot'], text: '100%_', max_minutes: 15 }, reader)
    const calls = Object.fromEntries(asked[0].calls)
    expect(calls.overlaps).toEqual(['tags', ['foot']])
    expect(calls.ilike).toEqual(['title', '%100\\%\\_%'])
    expect(calls.lte).toEqual(['duration_s', 900])
    expect(calls.limit).toEqual([20])
  })
})

describe('proposals', () => {
  const TODAY = '2026-11-04' // a Wednesday
  const SESSION = { id: 's1', date: '2026-11-05', slot: 'pm', position: 1, kind: 'trainer', title: 'Lezione', instructions: 'Online.', exercises: [], video_ids: [], session_logs: null }
  const BEFORE = { date: '2026-11-05', slot: 'pm', position: 1, kind: 'trainer', title: 'Lezione', instructions: 'Online.', exercises: [], video_ids: [] }

  // Answers each table with its own rows
  const reader = (tables: Record<string, unknown[]>) =>
    ({
      from(table: string) {
        return {
          select() {
            const query: unknown = new Proxy(
              {},
              { get: (_, name: string) => (name === 'then' ? (done: (r: unknown) => void) => done({ data: tables[table] ?? [], error: null }) : () => query) },
            )
            return query
          },
        }
      },
    }) as unknown as Reader
  const db = reader({ plan_sessions: [SESSION], videos: [{ yt_id: 'v1', title: 'Stretch', duration_s: null }] })
  const prepare = (changes: unknown, from = db) => prepareProposal({ summary: 'Sposta la lezione', changes }, from, TODAY)

  it('uses the same exercises as the app', () => {
    expect(EXERCISES).toEqual(Object.fromEntries(CATALOG.map((e) => [e.slug, e.name])))
  })

  it('moves a session, keeping how it was so that Applica can compare', async () => {
    const { changes, lines } = await prepare([{ action: 'change', session_id: 's1', date: '2026-11-06' }])
    expect(changes).toEqual([{ op: 'change', session_id: 's1', before: BEFORE, after: { ...BEFORE, date: '2026-11-06' } }])
    expect(lines).toEqual(['Sposta «Lezione»: gio 5 nov sera → ven 6 nov sera'])
  })

  it('never carries the log into the change', async () => {
    const { changes } = await prepare([{ action: 'remove', session_id: 's1' }])
    expect(JSON.stringify(changes)).not.toContain('session_logs')
  })

  it('adds a session, in lower case, with sensible defaults', async () => {
    const { changes, lines } = await prepare([{ action: 'add', date: TODAY, slot: 'am', kind: 'Mobility', title: 'Stretching', instructions: 'Con calma.', video_ids: ['v1'] }])
    expect(changes).toEqual([{ op: 'add', after: { date: TODAY, slot: 'am', position: 1, kind: 'mobility', title: 'Stretching', instructions: 'Con calma.', exercises: [], video_ids: ['v1'] } }])
    expect(lines).toEqual(['Aggiungi mer 4 nov mattina, «Stretching»: Con calma.', 'Video: Stretch'])
  })

  it('writes the weekly note, keeping what it does not change', async () => {
    const withNote = reader({ reviews: [{ week_start: '2026-11-09', summary: 'Bene.', decisions: 'Vecchio.' }] })
    const { changes, lines } = await prepare([{ action: 'note', week_start: '2026-11-09', decisions: 'Con calma.' }], withNote)
    expect(changes).toEqual([{ op: 'note', before: { summary: 'Bene.', decisions: 'Vecchio.' }, after: { week_start: '2026-11-09', summary: 'Bene.', decisions: 'Con calma.' } }])
    expect(lines).toEqual(['Nota della settimana del lun 9 nov: Con calma.'])
  })

  it.each([
    ['an unknown session', { action: 'change', session_id: 'nope', date: '2026-11-06' }, 'not found'],
    ['an unknown exercise', { action: 'change', session_id: 's1', exercises: ['plank'] }, 'unknown exercise plank'],
    ['a video not in her list', { action: 'change', session_id: 's1', video_ids: ['nope'] }, 'not in her list'],
    ['a slot that does not exist', { action: 'change', session_id: 's1', slot: 'noon' }, 'slot must be'],
    ['a date in the past', { action: 'change', session_id: 's1', date: '2026-11-01' }, 'date must be between'],
    ['a date too far ahead', { action: 'change', session_id: 's1', date: '2028-01-01' }, 'date must be between'],
    ['a new session with no title', { action: 'add', date: TODAY, slot: 'am', kind: 'foot' }, 'title is missing'],
    ['a change of nothing', { action: 'change', session_id: 's1' }, 'changes nothing'],
    ['a note on a day that is not Monday', { action: 'note', week_start: '2026-11-10', decisions: 'x' }, 'must be a Monday'],
    ['a note for a past week', { action: 'note', week_start: '2026-10-26', decisions: 'x' }, 'in the past'],
    ['an empty note', { action: 'note', week_start: '2026-11-09' }, 'summary or decisions'],
    ['an unknown action', { action: 'delete_all' }, 'unknown action'],
  ])('refuses %s, and says why', async (_, change, problem) => {
    const { problems, changes } = await prepare([change])
    expect(problems?.join()).toContain(problem)
    expect(changes).toBeUndefined()
  })

  describe('every session has something to follow', () => {
    const add = { action: 'add', date: TODAY, slot: 'am', title: 'Seduta' }

    it('refuses a new session with only words', async () => {
      const { problems } = await prepare([{ ...add, kind: 'mobility', instructions: 'Stretching a memoria.' }])
      expect(problems?.join()).toContain('needs a video')
    })

    it('wants drawn figures in a pill: a video is not enough', async () => {
      expect((await prepare([{ ...add, kind: 'pill', video_ids: ['v1'] }])).problems?.join()).toContain('a pill needs')
      expect((await prepare([{ ...add, kind: 'pill', exercises: ['banded_inversion'] }])).problems).toBeUndefined()
    })

    it('accepts a video or figures, and a lesson with neither', async () => {
      expect((await prepare([{ ...add, kind: 'mobility', video_ids: ['v1'] }])).problems).toBeUndefined()
      expect((await prepare([{ ...add, kind: 'foot', exercises: ['banded_inversion'] }])).problems).toBeUndefined()
      expect((await prepare([{ ...add, kind: 'trainer' }])).problems).toBeUndefined()
    })

    it('refuses taking away the only content, but lets an old session move', async () => {
      const old = reader({ plan_sessions: [{ ...SESSION, kind: 'mobility', video_ids: ['v1'] }], videos: [{ yt_id: 'v1' }] })
      expect((await prepare([{ action: 'change', session_id: 's1', video_ids: [] }], old)).problems?.join()).toContain('needs a video')
      const bare = reader({ plan_sessions: [{ ...SESSION, kind: 'mobility' }] })
      expect((await prepare([{ action: 'change', session_id: 's1', date: '2026-11-06' }], bare)).problems).toBeUndefined()
    })

    it('searches videos by length', async () => {
      const { reader: videos, asked } = fakeDb()
      await runTool('search_videos', { min_minutes: 8, max_minutes: 12 }, videos)
      const calls = Object.fromEntries(asked[0].calls)
      expect(calls.gte).toEqual(['duration_s', 480])
      expect(calls.lte).toEqual(['duration_s', 720])
    })
  })

  it('accepts a note for this week', async () => {
    expect((await prepare([{ action: 'note', week_start: '2026-11-02', decisions: 'x' }])).problems).toBeUndefined()
  })

  it('does not touch the past or what she logged', async () => {
    const past = reader({ plan_sessions: [{ ...SESSION, date: '2026-11-01' }] })
    expect((await prepare([{ action: 'change', session_id: 's1', date: '2026-11-06' }], past)).problems?.join()).toContain('in the past')
    const logged = reader({ plan_sessions: [{ ...SESSION, session_logs: { id: 'l' } }] })
    expect((await prepare([{ action: 'remove', session_id: 's1' }], logged)).problems?.join()).toContain('has a log')
    expect((await prepare([{ action: 'change', session_id: 's1', date: '2026-11-06' }], logged)).problems).toBeUndefined()
  })

  it('refuses the same session twice, too many changes, an empty proposal', async () => {
    const twice = { action: 'change', session_id: 's1', date: '2026-11-06' }
    expect((await prepare([twice, twice])).problems?.join()).toContain('twice')
    expect((await prepare(Array.from({ length: 31 }, () => twice))).problems?.join()).toContain('at most')
    expect((await prepare([])).problems?.join()).toContain('empty')
    expect((await prepareProposal({ changes: [twice] }, db, TODAY)).problems?.join()).toContain('summary')
  })

  it('writes one line for each thing that changes', () => {
    const change: Change = { op: 'change', session_id: 's1', before: BEFORE, after: { ...BEFORE, date: '2026-11-06', title: 'Nuova', instructions: 'Sì.', exercises: ['banded_inversion'] } }
    expect(linesOf(change)).toEqual(['Sposta «Lezione»: gio 5 nov sera → ven 6 nov sera', 'Cambia «Lezione» in «Nuova»: Sì.', `Disegni: ${EXERCISES.banded_inversion}`])
    expect(linesOf({ op: 'remove', session_id: 's1', before: BEFORE })).toEqual(['Togli «Lezione», gio 5 nov sera'])
  })

  it('says on the card which video and figures she is accepting', async () => {
    const library = reader({ videos: [{ yt_id: 'v1', title: 'Hip Stretch', duration_s: 610 }] })
    const { lines } = await prepare([{ action: 'add', date: TODAY, slot: 'am', kind: 'foot', title: 'Seduta', video_ids: ['v1'], exercises: ['banded_inversion'] }], library)
    expect(lines).toEqual(['Aggiungi mer 4 nov mattina, «Seduta»', 'Video: Hip Stretch (10 min)', `Disegni: ${EXERCISES.banded_inversion}`])
  })

  it('names only what is new when a session changes', async () => {
    const library = reader({
      plan_sessions: [{ ...SESSION, kind: 'mobility', video_ids: ['v1'] }],
      videos: [{ yt_id: 'v1', title: 'Vecchio', duration_s: 300 }, { yt_id: 'v2', title: 'Nuovo', duration_s: 600 }],
    })
    const { lines } = await prepare([{ action: 'change', session_id: 's1', video_ids: ['v1', 'v2'] }], library)
    expect(lines).toEqual(['Cambia «Lezione»', 'Video: Nuovo (10 min)'])
  })

  it('never shows an empty card when only the order changes', async () => {
    const { lines } = await prepare([{ action: 'change', session_id: 's1', position: 3 }])
    expect(lines).toEqual(['Cambia l’ordine di «Lezione», gio 5 nov sera'])
  })

  it('tells the coach what she decided', () => {
    expect(decisionNotes([{ summary: 'A', status: 'applied' }, { summary: 'B', status: 'stale' }])).toEqual(['Proposta "A": applicata.', 'Proposta "B": non applicata, perché nel frattempo il piano era cambiato.'])
    expect(userBlocks('Ciao', 'Oggi.', [], ['Proposta "A": applicata.'])[0].text).toBe('Oggi.\nProposta "A": applicata.')
  })
})

describe('conversations', () => {
  const NOW = Date.parse('2026-11-02T12:00:00Z')
  const thread = { fingerprint: 'a', closed: false }

  it('goes on in the same conversation', () => {
    expect(needsNewThread(thread, '2026-11-02T08:00:00Z', 'a', NOW)).toBe(false)
  })

  it('starts anew with no conversation, after a closed one, after a change or a long pause', () => {
    expect(needsNewThread(null, null, 'a', NOW)).toBe(true)
    expect(needsNewThread({ ...thread, closed: true }, '2026-11-02T08:00:00Z', 'a', NOW)).toBe(true)
    expect(needsNewThread(thread, '2026-11-02T08:00:00Z', 'b', NOW)).toBe(true)
    expect(needsNewThread(thread, '2026-11-01T11:59:00Z', 'a', NOW)).toBe(true)
  })

  it('keeps the date out of the system prompt, which must not change', () => {
    expect(systemPrompt('  ')).toBe(systemPrompt(''))
    expect(systemPrompt('Si chiama Prova.')).toContain('Si chiama Prova.')
    expect(systemPrompt('')).not.toMatch(/\d{4}-\d{2}-\d{2}T/)
  })

  it('puts the end of the last conversation in the first message only', () => {
    expect(userBlocks('Ciao', 'Oggi.')).toEqual([{ type: 'text', text: 'Oggi.' }, { type: 'text', text: 'Ciao' }])
    const [first] = userBlocks('Ciao', 'Oggi.', [{ role: 'user', text: 'A' }, { role: 'assistant', text: 'B' }])
    expect(first.text).toContain('Lei: A\nCoach: B')
  })

  it('shows only the words of a reply', () => {
    expect(visibleText([{ type: 'thinking' }, { type: 'text', text: ' Ciao ' }, { type: 'tool_use' }])).toBe('Ciao')
    expect(visibleText([{ type: 'tool_use' }])).toBe('')
  })

  it('has the same longest message as the app', () => {
    expect(MAX_CHARS).toBe(CHAT_MAX_CHARS)
  })
})

describe('the date', () => {
  it('reads the clock where she lives', () => {
    expect(appMoment(new Date('2026-11-02T08:30:00Z'))).toEqual({ today: '2026-11-02', label: 'Oggi è lunedì 2026-11-02, ore 09:30.' })
  })

  it('follows summer time', () => {
    expect(appMoment(new Date('2026-07-01T08:30:00Z')).label).toContain('ore 10:30')
  })

  it('stays on the day before until 04:00, like the app', () => {
    expect(appMoment(new Date('2026-11-02T01:30:00Z'))).toEqual({ today: '2026-11-01', label: 'Oggi è domenica 2026-11-01, ore 02:30.' })
    expect(appMoment(new Date('2026-11-02T03:00:00Z')).today).toBe('2026-11-02')
  })
})
