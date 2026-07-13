'use client'

import { useState, useEffect } from 'react'
import { requestPermission, subscribeToPush } from '@/lib/notifications'

const PROMPT_KEY = 'ekadashi_notif_prompted'

interface NotificationPromptProps {
  labels: {
    title: string
    message: string
    enable: string
    later: string
    thanks: string
  }
}

export default function NotificationPrompt({ labels }: NotificationPromptProps) {
  const [visible, setVisible] = useState(false)
  const [thanks, setThanks] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const prompted = localStorage.getItem(PROMPT_KEY)
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return
    if (!prompted) setVisible(true)

    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then(status => {
        status.onchange = () => {
          if (status.state === 'granted' || status.state === 'denied') setVisible(false)
        }
      })
    }
  }, [])

  const handleEnable = async () => {
    setBusy(true)
    setError('')
    try {
      const ok = await requestPermission()
      if (!ok) {
        localStorage.setItem(PROMPT_KEY, 'true')
        setError('❌ Permission denied. Enable in browser settings (🔒 site info > Notifications > Allow).')
        setTimeout(() => setVisible(false), 5000)
        setBusy(false)
        return
      }
      const subOk = await subscribeToPush()
      if (!subOk) {
        setError('Failed to subscribe to push. Check console for details.')
        setBusy(false)
        return
      }
      localStorage.setItem(PROMPT_KEY, 'true')
      setVisible(false)
      setThanks(true)
      setTimeout(() => setThanks(false), 3000)
    } catch (err) {
      setError('Unexpected error: ' + String(err))
    }
    setBusy(false)
  }

  const handleLater = () => {
    localStorage.setItem(PROMPT_KEY, 'true')
    setVisible(false)
  }

  if (!visible && !thanks) return null

  return (
    <>
      {visible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(13,10,46,0.8)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="glass-dark rounded-3xl max-w-sm w-full p-6 text-center"
            style={{ border: '1px solid rgba(244,196,48,0.2)' }}
          >
            <div className="text-4xl mb-4">🔔</div>
            <h2
              className="text-lg font-bold mb-2"
              style={{ fontFamily: 'var(--font-display)', color: '#fdf6e3' }}
            >
              {labels.title}
            </h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'rgba(210,180,140,0.8)' }}>
              {labels.message}
            </p>

            {error && (
              <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ color: '#ff6b6b', background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)' }}>
                ❌ {error}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleEnable}
                disabled={busy}
                className="btn-saffron justify-center text-sm w-full"
                style={busy ? { opacity: 0.6 } : {}}
              >
                {busy ? '⏳ Enabling...' : `🔔 ${labels.enable}`}
              </button>
              <button
                onClick={handleLater}
                className="text-sm px-5 py-2.5 rounded-full transition-colors"
                style={{
                  color: 'rgba(210,180,140,0.6)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
              >
                {labels.later}
              </button>
            </div>
          </div>
        </div>
      )}

      {thanks && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 glass-dark rounded-2xl px-5 py-3 text-sm animate-pulse-slow"
          style={{ border: '1px solid rgba(244,196,48,0.2)', color: '#fdf6e3' }}
        >
          ✅ {labels.thanks}
        </div>
      )}
    </>
  )
}
