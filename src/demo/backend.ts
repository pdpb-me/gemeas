// The demo's backend (swapped in for src/data/backend.ts by `vite --mode demo`):
// the in-memory database of src/demo/state.ts, and the demo bar.
import { lazy } from 'react'
import type { Backend } from '@/data/api'
import { createMemoryBackend } from '@/demo/memory'
import { demo } from '@/demo/state'

export { DemoBar } from '@/demo/demo-bar'
export const DemoLibrary = lazy(() => import('@/demo/library'))
export const DemoCoachNotice = 'Demo: risposte già scritte, non è il vero coach.'

const params = new URLSearchParams(location.search)
// ?latency=600 slows every read and write down, to see loading states
const latency = Number(params.get('latency') ?? 0) || 0
const memory = createMemoryBackend(demo.db, { latencyMs: () => latency, replyPauseMs: 35 })

// ?chatfail=load or ?chatfail=send: to see the chat's error states
const chatFail = params.get('chatfail')
if (chatFail === 'load')
  memory.chatMessages = async () => {
    throw new Error('Demo: la chat non si carica')
  }
if (chatFail === 'send')
  memory.sendChat = async () => {
    throw new Error('Il coach non risponde adesso. Riprova tra poco.')
  }

// ?foot=0: the app for someone who doesn't follow the foot
if (params.get('foot') === '0') memory.tracksFoot = async () => false

const WRITES = new Set<keyof Backend>([
  'setStatus',
  'setEffort',
  'setPain',
  'setComment',
  'setTest',
  'moveSession',
  'saveCheckIn',
  'saveWeight',
  'addWalk',
  'removeWalk',
  'sendChat',
  'decideProposal',
])

// Every write is remembered in this browser
export const backend: Backend = Object.fromEntries(
  Object.entries(memory).map(([name, fn]) => [
    name,
    WRITES.has(name as keyof Backend)
      ? async (...args: unknown[]) => {
          const result = await (fn as (...a: unknown[]) => Promise<unknown>)(...args)
          demo.saved()
          return result
        }
      : fn,
  ]),
) as unknown as Backend
