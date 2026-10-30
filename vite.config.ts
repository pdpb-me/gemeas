import path from 'node:path'
import { rmSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Two builds from the same code:
// - the real app (`vite`, `vite build`): https://pdpb-me.github.io/gemeas/
// - the demo (`vite --mode demo`, `vite build --mode demo`): made-up data, no login, no
//   Supabase, served at https://pdpb-me.github.io/gemeas/demo/. It swaps the data
//   backend for an in-memory one, and isn't installable (no manifest, no service worker),
//   so it never clashes with the real app on the phone.
export default defineConfig(({ mode }) => {
  const demo = mode === 'demo'
  return {
    base: demo ? '/gemeas/demo/' : '/gemeas/',
    plugins: [react(), tailwindcss(), demo && notInstallable()],
    resolve: {
      alias: [
        ...(demo ? [{ find: /^@\/data\/backend$/, replacement: path.resolve(import.meta.dirname, './src/demo/backend.ts') }] : []),
        { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
      ],
    },
    build: demo ? { outDir: 'dist/demo' } : {},
  }
})

// Demo: no manifest link in the page, and no manifest or service worker in the folder
function notInstallable(): Plugin {
  let outDir = ''
  return {
    name: 'gemeas-demo-not-installable',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    transformIndexHtml(html) {
      return html
        .replace(/\s*<link rel="manifest"[^>]*>/, '')
        .replace('<title>Gemeas</title>', '<title>Gemeas · demo</title>')
    },
    closeBundle() {
      for (const f of ['manifest.webmanifest', 'sw.js']) rmSync(path.join(outDir, f), { force: true })
    },
  }
}
