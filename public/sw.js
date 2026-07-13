const CACHE_NAME = 'ekadashi-v5'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Push event: show notification from payload ─────────────────────────
self.addEventListener('push', (event) => {
  let data = null
  try {
    if (event.data) data = event.data.json()
  } catch { /* ignore */ }

  if (data) {
    const options = {
      body: data.body,
      tag: data.tag,
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: '/' },
      requireInteraction: true,
      silent: false,
    }
    if (data.image) options.image = data.image
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

// ── Notification click: navigate to relevant page ──────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  let url = '/'
  if (event.notification.tag?.startsWith('ek:')) url = '/en/calendar/'
  else if (event.notification.tag?.startsWith('ft:')) url = '/en/calendar/'
  else if (event.notification.tag?.startsWith('jp:')) url = '/en/tracker/'
  event.waitUntil(self.clients.openWindow(url))
})

// ── Fetch: cache-first strategy ────────────────────────────────────────
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
