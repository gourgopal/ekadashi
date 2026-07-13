const CACHE_NAME = 'ekadashi-v3'

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
  '/sa/',
  '/sa/calendar/',
  '/sa/tracker/',
  '/sa/resources/',
  '/ru/',
  '/ru/calendar/',
  '/ru/tracker/',
  '/ru/resources/',
  '/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const results = await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => {
            // Try fetching and putting manually in case cache.add doesn't support the response
            return fetch(url).then((res) => {
              if (res.ok) cache.put(url, res)
            })
          })
        )
      )
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        console.warn('[SW] Pre-cache failures:', failed.length, 'of', PRECACHE_URLS.length)
      }
      self.skipWaiting()
    })()
  )
})

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

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== location.origin) return

  if (url.pathname.startsWith('/audio/')) return

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
