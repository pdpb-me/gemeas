// Gemeas service worker. It makes the app installable, and deliberately
// caches nothing: every open loads the latest version from GitHub Pages.
// (The app needs the internet anyway to read and save your logs.)
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // No respondWith: the browser handles every request normally
})
