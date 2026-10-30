import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Tests for the pure logic (src/lib) and the demo's simulator. `npm test`
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  // Our time zone, so summer-time changes are tested where they happen
  test: { environment: 'node', include: ['src/**/*.test.ts'], env: { TZ: 'Europe/Madrid' } },
})
