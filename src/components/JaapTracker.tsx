'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { hasPermission, requestPermission, wasPrompted, scheduleJaapReminder, getJaapReminderHour, clearJaapReminderHour, showNaamJaapReminder } from '@/lib/notifications'

const STORAGE_KEY = 'ekadashi_jaap_tracker'
const BEADS_PER_ROUND = 108

interface StoredData {
  count: number
  date: string  // YYYY-MM-DD
}

interface JaapTrackerProps {
  labels: {
    title: string
    subtitle: string
    tap_zone: string
    beads: string
    rounds: string
    daily_count: string
    one_round: string
    reset: string
    reset_confirm: string
    yes: string
    cancel: string
    mahamantra: string
    reminder_title?: string
    set_reminder?: string
    reminder_time?: string
    reminder_set?: string
    reminder_off?: string
    notifications_off?: string
  }
}

function getTodayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function JaapTracker({ labels }: JaapTrackerProps) {
  const [count, setCount] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)
  const [ripple, setRipple] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [reminderHour, setReminderHour] = useState<number | null>(null)
  const [notifSupported, setNotifSupported] = useState(false)
  const reminderScheduled = useRef(false)

  // Load from localStorage on mount; auto-reset if date changed
  useEffect(() => {
    setMounted(true)
    setNotifSupported(typeof Notification !== 'undefined')
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data: StoredData = JSON.parse(raw)
        if (data.date === getTodayISO()) {
          setCount(data.count)
        } else {
          setCount(0)
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ count: 0, date: getTodayISO() })
          )
        }
      }
    } catch {
      // Ignore parse errors
    }
    // Restore reminder hour
    const saved = getJaapReminderHour()
    if (saved !== null) setReminderHour(saved)
  }, [])

  const save = useCallback((newCount: number) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ count: newCount, date: getTodayISO() })
      )
    } catch { /* Quota exceeded or private browsing */ }
  }, [])

  // Schedule daily reminder
  useEffect(() => {
    if (reminderHour !== null && notifSupported && hasPermission() && !reminderScheduled.current) {
      reminderScheduled.current = true
      scheduleJaapReminder(reminderHour, labels.mahamantra)
    }
  }, [reminderHour, notifSupported, labels.mahamantra])

  const handleSetReminder = async () => {
    if (!hasPermission()) {
      const ok = await requestPermission()
      if (!ok) return
    }
    const hour = 6 // default 6 AM
    setReminderHour(hour)
    scheduleJaapReminder(hour, labels.mahamantra)
  }

  const handleClearReminder = () => {
    setReminderHour(null)
    clearJaapReminderHour()
    reminderScheduled.current = false
  }

  const handleTap = () => {
    const newCount = count + 1
    setCount(newCount)
    save(newCount)
    // Ripple animation
    setRipple(true)
    setTimeout(() => setRipple(false), 150)
  }

  const handleReset = () => {
    setCount(0)
    save(0)
    setConfirmReset(false)
  }

  const rounds = Math.floor(count / BEADS_PER_ROUND)
  const beadsInRound = count % BEADS_PER_ROUND
  const progress = (beadsInRound / BEADS_PER_ROUND) * 100

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div
          className="text-lg animate-pulse"
          style={{ color: 'rgba(210,180,140,0.5)', fontFamily: 'var(--font-serif)' }}
        >
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center gap-8" id="jaap-tracker">

      {/* Mahamantra */}
      <div className="text-center">
        <p
          className="text-sm leading-relaxed"
          style={{
            color: 'rgba(210,180,140,0.7)',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
          }}
        >
          {labels.mahamantra}
        </p>
      </div>

      {/* Stats row */}
      <div className="w-full grid grid-cols-2 gap-4">
        <div
          className="glass rounded-2xl p-5 text-center card-hover"
          id="jaap-rounds-display"
        >
          <div
            className="text-5xl font-bold mb-1"
            style={{ color: '#F4C430', fontFamily: 'var(--font-display)' }}
          >
            {rounds}
          </div>
          <div
            className="text-xs uppercase tracking-widest"
            style={{ color: 'rgba(210,180,140,0.6)' }}
          >
            {labels.rounds}
          </div>
        </div>
        <div
          className="glass rounded-2xl p-5 text-center card-hover"
          id="jaap-beads-display"
        >
          <div
            className="text-5xl font-bold mb-1"
            style={{ color: '#fdf6e3', fontFamily: 'var(--font-display)' }}
          >
            {beadsInRound}
          </div>
          <div
            className="text-xs uppercase tracking-widest"
            style={{ color: 'rgba(210,180,140,0.6)' }}
          >
            {labels.beads}
          </div>
        </div>
      </div>

      {/* Progress ring */}
      <div className="relative flex items-center justify-center">
        <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
          {/* Background ring */}
          <circle
            cx="110" cy="110" r="96"
            fill="none"
            stroke="rgba(244,196,48,0.1)"
            strokeWidth="8"
          />
          {/* Progress arc */}
          <circle
            cx="110" cy="110" r="96"
            fill="none"
            stroke="#F4C430"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 96}`}
            strokeDashoffset={`${2 * Math.PI * 96 * (1 - progress / 100)}`}
            transform="rotate(-90 110 110)"
            style={{ transition: 'stroke-dashoffset 0.3s ease', filter: 'drop-shadow(0 0 6px rgba(244,196,48,0.5))' }}
          />
        </svg>

        {/* Center total count */}
        <div className="absolute text-center">
          <div
            className="text-6xl font-bold"
            style={{ color: '#F4C430', fontFamily: 'var(--font-display)', lineHeight: 1 }}
            id="jaap-total-count"
          >
            {count}
          </div>
          <div
            className="text-xs uppercase tracking-widest mt-1"
            style={{ color: 'rgba(210,180,140,0.5)' }}
          >
            {labels.daily_count}
          </div>
        </div>
      </div>

      {/* TAP ZONE */}
      <button
        id="jaap-tap-button"
        onClick={handleTap}
        className="jaap-tap-btn w-full rounded-3xl py-8 px-6 relative overflow-hidden"
        style={{
          background: ripple
            ? 'radial-gradient(circle at center, rgba(244,196,48,0.35) 0%, rgba(244,196,48,0.15) 100%)'
            : 'radial-gradient(circle at center, rgba(244,196,48,0.18) 0%, rgba(244,196,48,0.06) 100%)',
          border: `2px solid ${ripple ? 'rgba(244,196,48,0.6)' : 'rgba(244,196,48,0.25)'}`,
          boxShadow: ripple
            ? '0 0 40px rgba(244,196,48,0.3), inset 0 0 30px rgba(244,196,48,0.1)'
            : '0 4px 24px rgba(0,0,0,0.2)',
          transition: 'all 0.1s ease',
        }}
        aria-label={labels.tap_zone}
      >
        <div className="flex flex-col items-center gap-3">
          <span
            className="text-5xl select-none"
            style={{
              color: '#F4C430',
              textShadow: '0 0 20px rgba(244,196,48,0.5)',
              transition: 'transform 0.1s ease',
              transform: ripple ? 'scale(0.93)' : 'scale(1)',
            }}
          >
            📿
          </span>
          <span
            className="text-lg font-semibold"
            style={{ color: '#fdf6e3', fontFamily: 'var(--font-serif)' }}
          >
            {labels.tap_zone}
          </span>
          <span
            className="text-xs"
            style={{ color: 'rgba(210,180,140,0.5)' }}
          >
            {labels.one_round}
          </span>
        </div>
      </button>

      {/* Reminder section */}
      {notifSupported && labels.reminder_title && (
        <div className="w-full glass rounded-2xl p-4" style={{ border: '1px solid rgba(244,196,48,0.12)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#F4C430' }}>
                  {labels.reminder_title}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(210,180,140,0.6)' }}>
                  {reminderHour !== null
                    ? `${labels.reminder_set} ${reminderHour}:00`
                    : labels.reminder_off}
                </div>
              </div>
            </div>
            {reminderHour !== null ? (
              <button
                onClick={handleClearReminder}
                className="text-xs px-3 py-1.5 rounded-full transition-colors"
                style={{
                  color: 'rgba(210,180,140,0.6)',
                  border: '1px solid rgba(210,180,140,0.2)',
                  cursor: 'pointer',
                }}
              >
                {labels.reminder_off}
              </button>
            ) : (
              <button
                onClick={handleSetReminder}
                className="btn-saffron text-xs px-3 py-1.5"
                style={{ fontSize: '0.7rem' }}
              >
                {labels.set_reminder}
              </button>
            )}
          </div>
          {!hasPermission() && !wasPrompted() && (
            <p className="text-xs mt-2" style={{ color: 'rgba(210,180,140,0.4)' }}>
              {labels.notifications_off}
            </p>
          )}
        </div>
      )}

      {/* Reset button */}
      {!confirmReset ? (
        <button
          id="jaap-reset-btn"
          onClick={() => setConfirmReset(true)}
          className="text-sm transition-colors px-4 py-2 rounded-full"
          style={{
            color: 'rgba(210,180,140,0.4)',
            background: 'none',
            border: '1px solid rgba(210,180,140,0.15)',
            cursor: 'pointer',
          }}
        >
          ↺ {labels.reset}
        </button>
      ) : (
        <div
          className="glass rounded-2xl p-4 text-center w-full"
          style={{ border: '1px solid rgba(244,196,48,0.2)' }}
        >
          <p className="text-sm mb-4" style={{ color: 'rgba(210,180,140,0.8)' }}>
            {labels.reset_confirm}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              id="jaap-reset-confirm"
              onClick={handleReset}
              className="btn-saffron text-sm px-5 py-2"
            >
              {labels.yes}
            </button>
            <button
              id="jaap-reset-cancel"
              onClick={() => setConfirmReset(false)}
              className="text-sm px-5 py-2 rounded-full transition-colors"
              style={{
                color: 'rgba(210,180,140,0.7)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
              }}
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
