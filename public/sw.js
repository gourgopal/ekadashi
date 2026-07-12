/**
 * Ekadashi Vrat — Service Worker
 * Cache-first strategy for static assets + stale-while-revalidate for pages.
 */

const CACHE_NAME = 'ekadashi-v1'

const PRECACHE_URLS = [
  '/',
  '/en/',
  '/en/calendar/',
  '/en/tracker/',
  '/en/resources/',
  '/hi/',
  '/hi/calendar/',
  '/hi/tracker/',
  '/hi/resources/',
  '/manifest.json',
]

// ── Install: pre-cache key pages ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Pre-cache failed for some URLs:', err)
      })
    }).then(() => self.skipWaiting())
  )
})

// ── Activate: remove old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: cache-first for static assets, network-first for navigation ────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== location.origin) return

  // Audio: network only (don't cache large audio files)
  if (url.pathname.startsWith('/audio/')) return

  // Static assets (JS, CSS, fonts, images): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(woff2?|ttf|png|jpg|svg|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          }
          return res
        })
      )
    )
    return
  }

  // Navigation / HTML: stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(request)
      if (cached) return cached
      try {
        const res = await fetch(request)
        if (res.ok) cache.put(request, res.clone())
        return res
      } catch {
        return new Response('Offline', { status: 503 })
      }
    })()
  )
})
