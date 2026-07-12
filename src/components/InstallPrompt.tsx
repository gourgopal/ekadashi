'use client'

import { useState, useEffect } from 'react'

const DISMISS_KEY = 'ekadashi_install_dismissed'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setVisible(true), 2000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setVisible(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setVisible(false)
  }

  if (!visible || !deferredPrompt) return null

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto glass-dark rounded-2xl p-4"
      style={{ border: '1px solid rgba(244,196,48,0.2)' }}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0" style={{ lineHeight: 1 }}>📲</div>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-bold mb-0.5"
            style={{ fontFamily: 'var(--font-display)', color: '#fdf6e3' }}
          >
            Install Ekadashi Vrat
          </div>
          <p className="text-xs mb-3" style={{ color: 'rgba(210,180,140,0.7)' }}>
            Add to your home screen for quick access to Ekadashi dates and Jaap tracking.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="btn-saffron text-xs px-4 py-1.5"
            >
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs px-4 py-1.5 rounded-full transition-colors"
              style={{
                color: 'rgba(210,180,140,0.5)',
                border: '1px solid rgba(210,180,140,0.15)',
                cursor: 'pointer',
                background: 'none',
              }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
