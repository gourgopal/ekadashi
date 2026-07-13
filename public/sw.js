const CACHE_NAME = 'ekadashi-v6'

const PUSH_WORKER = 'https://ekadashi-push.gourgopal.workers.dev'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Push event: fetch alerts from worker (no encryption needed) ────────
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      // First try encrypted data (legacy, in case it arrives)
      let data = null
      try {
        if (event.data) data = event.data.json()
      } catch { /* ignore */ }

      // Fetch current alerts from the worker (works for empty pushes too)
      let alerts = null
      try {
        const resp = await fetch(`${PUSH_WORKER}/current-alerts`)
        if (resp.ok) alerts = await resp.json()
      } catch { /* fall through */ }

      if (alerts?.length) {
        for (const a of alerts) {
          await self.registration.showNotification(a.title || 'Hare Krishna!', {
            body: a.body || 'Tap to open Ekadashi Vrat',
            tag: a.tag || 'push-' + Date.now(),
            icon: a.icon || '/icons/icon-192.png',
            badge: a.badge || '/icons/badge.png',
            image: a.image || '/icons/icon-512.png',
            vibrate: a.vibrate || [200, 100, 200],
            requireInteraction: true,
            data: { url: a.url || '/' },
          })
        }
        return
      }

      // Fallback: show data from encrypted push payload
      if (data) {
        await self.registration.showNotification(data.title || 'Hare Krishna!', {
          body: data.body || 'Tap to open Ekadashi Vrat',
          tag: data.tag || 'push-' + Date.now(),
          icon: data.icon || '/icons/icon-192.png',
          badge: data.badge || '/icons/badge.png',
          image: data.image || '/icons/icon-512.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          data: { url: data.url || '/' },
        })
        return
      }

      // Final fallback: show generic notification
      await self.registration.showNotification('Hare Krishna!', {
        body: 'Tap to open Ekadashi Vrat',
        tag: 'push-' + Date.now(),
        icon: '/icons/icon-192.png',
        badge: '/icons/badge.png',
        image: '/icons/icon-512.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { url: '/' },
      })
    })()
  )
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
