// The demo's backend (swapped in for src/data/backend.ts by `vite --mode demo`):
// the in-memory database of src/demo/state.ts, and the demo bar.
import type { Backend } from '@/data/api'
import { createMemoryBackend } from '@/demo/memory'
import { demo } from '@/demo/state'

export { DemoBar } from '@/demo/demo-bar'

// ?latency=600 slows every read and write down, to see loading states
const latency = Number(new URLSearchParams(location.search).get('latency') ?? 0) || 0
const memory = createMemoryBackend(demo.db, { latencyMs: () => latency })

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
