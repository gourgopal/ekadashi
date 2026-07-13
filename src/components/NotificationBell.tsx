'use client'

import { useState, useEffect } from 'react'
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed, isNotificationSupported } from '@/lib/notifications'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [subStatus, setSubStatus] = useState<'loading' | 'granted' | 'denied' | 'default' | 'unsupported'>('loading')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!isNotificationSupported()) { setSubStatus('unsupported'); return }
    setSubStatus(Notification.permission as any)
    setSubscribed(isPushSubscribed())

    const onDocClick = () => setOpen(false)
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const handleEnable = async () => {
    setBusy(true)
    setErr('')
    const ok = await subscribeToPush()
    if (ok) {
      setSubStatus('granted')
      setSubscribed(true)
    } else {
      setSubStatus(Notification.permission as any)
      setErr(Notification.permission === 'denied' ? 'Blocked in browser settings' : 'Permission denied')
    }
    setBusy(false)
  }

  const handleDisable = async () => {
    setBusy(true)
    setErr('')
    await unsubscribeFromPush()
    setSubscribed(false)
    setBusy(false)
  }

  const icon = subStatus === 'granted' && subscribed ? '🔔' : '🔕'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-sm transition-all"
        style={{ background: open ? 'rgba(244,196,48,0.15)' : 'transparent' }}
        aria-label="Notification settings"
        title={
          subStatus === 'granted' && subscribed ? 'Notifications on' :
          subStatus === 'denied' ? 'Notifications blocked' :
          'Notifications off'
        }
      >
        {icon}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden glass-dark"
          style={{
            width: '240px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(244,196,48,0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 text-sm">
            <div className="font-bold mb-2" style={{ color: '#fdf6e3' }}>🔔 Notifications</div>

            {subStatus === 'unsupported' && (
              <p className="text-xs" style={{ color: 'rgba(210,180,140,0.6)' }}>Not supported on this browser</p>
            )}

            {subStatus === 'denied' && (
              <div>
                <p className="text-xs mb-2" style={{ color: '#ff6b6b' }}>Blocked by browser</p>
                <p className="text-xs" style={{ color: 'rgba(210,180,140,0.6)' }}>
                  Enable in site info → Notifications → Allow
                </p>
              </div>
            )}

            {subStatus === 'default' && !subscribed && (
              <button
                onClick={handleEnable}
                disabled={busy}
                className="w-full text-xs py-2 rounded-lg font-medium transition-colors"
                style={{ background: 'rgba(244,196,48,0.15)', color: '#F4C430' }}
              >
                {busy ? '⏳ Enabling...' : 'Enable Notifications'}
              </button>
            )}

            {subStatus === 'granted' && !subscribed && (
              <button
                onClick={handleEnable}
                disabled={busy}
                className="w-full text-xs py-2 rounded-lg font-medium transition-colors"
                style={{ background: 'rgba(244,196,48,0.15)', color: '#F4C430' }}
              >
                {busy ? '⏳ Subscribing...' : 'Re-subscribe'}
              </button>
            )}

            {subStatus === 'granted' && subscribed && (
              <div>
                <p className="text-xs mb-2" style={{ color: '#4ade80' }}>✅ Subscribed</p>
                <button
                  onClick={handleDisable}
                  disabled={busy}
                  className="w-full text-xs py-2 rounded-lg font-medium transition-colors"
                  style={{ background: 'rgba(255,0,0,0.1)', color: '#ff6b6b' }}
                >
                  {busy ? '⏳...' : 'Unsubscribe'}
                </button>
              </div>
            )}

            {err && (
              <p className="text-xs mt-2" style={{ color: '#ff6b6b' }}>{err}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
