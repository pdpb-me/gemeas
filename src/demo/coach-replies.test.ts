import { beforeEach, describe, expect, it } from 'vitest'
import type { Backend } from '@/data/api'
import { CHAT_MAX_CHARS, checkInRow } from '@/data/rules'
import { scriptedReply } from '@/demo/coach-replies'
import { emptyDb, type Db } from '@/demo/db'
import { createMemoryBackend } from '@/demo/memory'
import { appDay } from '@/lib/dates'
import { now } from '@/lib/clock'

const TODAY = '2026-11-19'
let db: Db

const morning = (date: string, score: number) =>
  db.symptoms.push({ ...checkInRow(date, score), id: date, session_log_id: null, created_at: `${date}T07:00:00Z`, user_id: 'u' })

beforeEach(() => {
  db = emptyDb()
})

describe('the demo coach', () => {
  it('says the pain in its word, and suggests a doctor when it is not low', () => {
    morning('2026-11-18', 2)
    morning(TODAY, 8)
    const reply = scriptedReply('Mi fa male il piede', db, TODAY)
    expect(reply).toContain('Forte')
    expect(reply).toContain('medico')
  })

  it('does not suggest a doctor when the pain is low', () => {
    morning(TODAY, 2)
    const reply = scriptedReply('Come sta il piede?', db, TODAY)
    expect(reply).toContain('Lieve')
    expect(reply).not.toContain('medico')
  })

  it('answers about pain first, even when the message also asks about the plan', () => {
    morning(TODAY, 5)
    expect(scriptedReply('Oggi ho dolore, cosa faccio?', db, TODAY)).toContain('Medio')
  })

  it('does not talk about weight, even with a weight in the data', () => {
    db.weights.push({ id: 'w', date: TODAY, kg: 61.5, created_at: `${TODAY}T07:00:00Z`, user_id: 'u' })
    const reply = scriptedReply('Quanto è il mio peso?', db, TODAY)
    expect(reply).toContain('Del peso qui non parlo')
    expect(reply).not.toContain('61')
  })

  it('says it cannot change the plan', () => {
    expect(scriptedReply('Puoi spostare la lezione?', db, TODAY)).toContain('non posso cambiare il piano')
  })

  it('reads the plan of today, in order, and only today', () => {
    const session = (id: string, date: string, slot: string, position: number, title: string) =>
      db.plan_sessions.push({ id, date, slot, position, title, kind: 'foot', instructions: null, exercises: [], video_ids: [], block: null, created_at: `${date}T07:00:00Z`, user_id: 'u' })
    session('c', TODAY, 'pm', 1, 'Lezione')
    session('b', TODAY, 'pm', 0, 'Pillola')
    session('a', TODAY, 'am', 0, 'Mobilità')
    session('x', '2026-11-20', 'am', 0, 'Domani')
    expect(scriptedReply('Cosa faccio oggi?', db, TODAY)).toBe('Ecco il piano di oggi:\nMattina: Mobilità\nSera: Pillola\nSera: Lezione')
  })

  it('counts the walks of the last 7 days', () => {
    const walk = (id: string, date: string, duration_s: number) =>
      db.activities.push({ id, date, sport: 'walk', source: 'manual', duration_s, distance_m: null, elevation_m: null, external_id: null, hr_avg: null, load: null, notes: null, plan_session_id: null, raw: null, created_at: `${date}T07:00:00Z`, user_id: 'u' })
    walk('a', TODAY, 1800)
    walk('b', '2026-11-13', 1800)
    walk('old', '2026-11-12', 1800)
    expect(scriptedReply('Quante camminate ho fatto?', db, TODAY)).toBe('Negli ultimi 7 giorni vedo 2 camminate, 1 h 00 in tutto.')
  })

  it('says it is a demo when it has no answer', () => {
    expect(scriptedReply('Che tempo fa domani?', db, TODAY)).toContain('Nella demo')
  })
})

describe('the chat', () => {
  let api: Backend
  beforeEach(() => {
    api = createMemoryBackend(() => db)
  })

  it('saves the message and the reply, in order, and gives the reply a piece at a time', async () => {
    const pieces: string[] = []
    await api.sendChat('  Ciao  ', (soFar) => pieces.push(soFar))
    const messages = await api.chatMessages()
    expect(messages.map((m) => m.role)).toEqual(['user', 'coach'])
    expect(messages[0].text).toBe('Ciao')
    expect(pieces.length).toBeGreaterThan(1)
    expect(pieces.at(-1)).toBe(messages[1].text)
    expect(pieces[0].length).toBeLessThan(messages[1].text.length)
  })

  it('refuses an empty or too long message, and saves nothing', async () => {
    await expect(api.sendChat('   ', () => {})).rejects.toThrow('Valore non valido')
    await expect(api.sendChat('a'.repeat(CHAT_MAX_CHARS + 1), () => {})).rejects.toThrow('Valore non valido')
    expect(await api.chatMessages()).toEqual([])
  })

  it('never hands out its own copy of the messages', async () => {
    await api.sendChat('Ciao', () => {})
    const messages = await api.chatMessages()
    messages[0].text = 'cambiato'
    expect(db.chat_messages[0].text).toBe('Ciao')
  })

  it('reads the app day for the plan', async () => {
    db.plan_sessions.push({ id: 'p', date: appDay(now()), slot: 'am', position: 0, title: 'Mobilità', kind: 'mobility', instructions: null, exercises: [], video_ids: [], block: null, created_at: '2026-01-01T00:00:00Z', user_id: 'u' })
    await api.sendChat('Cosa faccio oggi?', () => {})
    expect(db.chat_messages[1].text).toContain('Mobilità')
  })
})
