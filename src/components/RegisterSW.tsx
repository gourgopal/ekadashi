'use client'

import { useEffect } from 'react'

/**
 * RegisterSW — registers the service worker for PWA/offline support.
 * Must be a client component so it can access the browser's navigator API.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[SW] Registered:', reg.scope)
        })
        .catch((err) => {
          console.warn('[SW] Registration failed:', err)
        })
    }
  }, [])

  return null
}
