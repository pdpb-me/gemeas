import { describe, expect, it } from 'vitest'
import { CHAT_MAX_CHARS } from '@/data/rules'
import { PAIN_LEVELS, painLabel } from '@/lib/pain'
import { appMoment, MAX_CHARS, needsNewThread, painWord, period, runTool, systemPrompt, TOOLS, userBlocks, visibleText, type Reader } from '../../supabase/functions/_shared/coach.ts'

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
    for (const tool of TOOLS) await runTool(tool.name, WEEK, reader)
    expect(asked.map((a) => a.table).sort()).toEqual(['activities', 'plan_sessions', 'reviews', 'symptoms', 'tests', 'videos'])
    for (const a of asked) {
      expect(a.table).not.toContain('.')
      expect(a.columns).not.toContain('*')
      expect(a.columns).not.toContain('raw')
    }
  })

  it('has no tool that writes', () => {
    for (const tool of TOOLS) expect(tool.name).toMatch(/^(get|search)_/)
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
