// Screenshots of the demo at phone size (360 × 800), for reviews and the PR.
// Usage: node scripts/demo-shots.mjs <out-folder> [base-url]
//   base-url defaults to http://localhost:4173/gemeas/demo/ (npm run build, then npx vite preview)
// Each shot: a scenario (see src/demo/state.ts), then optional steps (taps) before the picture.
// Needs Playwright with Chromium (npx playwright, or a global install).
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  ;({ chromium } = require(path.join(process.env.NODE_PATH ?? '/opt/node22/lib/node_modules', 'playwright')))
}

const out = process.argv[2] ?? 'screens'
const base = process.argv[3] ?? 'http://localhost:4173/gemeas/demo/'
const only = process.env.ONLY?.split(',')
mkdirSync(out, { recursive: true })

// taps an element, scrolled to the middle first (so the tab bar never covers it)
const tap = async (el) => {
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await el.click()
}
const text = (t) => (p) => tap(p.getByText(t, { exact: false }).first())
const role = (r, name) => (p) => tap(p.getByRole(r, { name }).first())
const swipeUp = async (p) => p.mouse.wheel(0, 2000)
const wait = (ms) => (p) => p.waitForTimeout(ms)

// name, scenario, steps
export const SHOTS = [
  ['01-oggi', 'today', [wait(600)]],
  ['02-oggi-sotto', 'today', [wait(500), swipeUp, wait(400)]],
  ['03-lezione', 'today', [wait(500), text('Lezione col trainer'), wait(500)]],
  ['04-quanto-dura', 'ordinary', [wait(500), text('Lezione col trainer'), wait(500), role('button', /^Modifica la registrazione/), wait(700)]],
  ['05-esercizio', 'gap', [wait(500), text('Forza del piede'), wait(400), text('Sollevamento talloni'), wait(500)]],
  ['07-sposta', 'moved', [wait(500), text('Lezione col trainer'), wait(400), role('button', 'Sposta'), wait(700)]],
  ['08-saltata', 'cancelled', [wait(500), role('button', /giovedì 24 settembre/), wait(600)]],
  ['09-piede-male', 'flare', [wait(500), (p) => p.getByRole('radio', { name: 'Forte' }).first().click(), wait(600)]],
  ['10-ieri', 'late', [wait(700)]],
  ['11-test', 'test-day', [wait(500), text('Test del piede'), wait(600)]],
  ['12-progressi', 'flare', [wait(500), role('button', 'Progressi'), wait(600)]],
  ['13-progressi-sotto', 'test', [wait(500), role('button', 'Progressi'), wait(600), swipeUp, wait(400)]],
  ['14-dettaglio-piede', 'flare', [wait(500), role('button', 'Progressi'), wait(600), role('button', /^Piede/), wait(600)]],
  ['15-peso', 'test', [wait(500), role('button', 'Progressi'), wait(600), role('button', /^Peso/), wait(600)]],
  ['16-attivita', 'today', [wait(500), role('button', 'Progressi'), wait(500), role('tab', /attività/i), wait(600)]],
  ['17-primo-giorno', 'day-one', [wait(700)]],
  ['18-primo-giorno-progressi', 'day-one', [wait(500), role('button', 'Progressi'), wait(600)]],
  ['19-ritorno', 'gap', [wait(700)]],
  ['20-caricamento', 'today', [], '&latency=4000'],
]

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined })
const failures = []
for (const [name, scenario, steps, extra = ''] of SHOTS) {
  if (only && !only.some((o) => name.includes(o))) continue
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  try {
    await page.goto(`${base}?scenario=${scenario}&bar=0${extra}`, { waitUntil: extra ? 'domcontentloaded' : 'networkidle' })
    if (extra) await page.waitForTimeout(700)
    for (const step of steps) await step(page)
    await page.screenshot({ path: path.join(out, `${name}.png`) })
    if (errors.length) failures.push(`${name}: ${errors.join('; ')}`)
  } catch (e) {
    failures.push(`${name}: ${e.message.split('\n')[0]}`)
  }
  await context.close()
}
await browser.close()
if (failures.length) {
  console.log('Problems:\n' + failures.join('\n'))
  process.exitCode = 1
} else console.log(`Saved to ${out}`)
