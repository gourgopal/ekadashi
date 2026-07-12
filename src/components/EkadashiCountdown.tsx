'use client'

import { useState, useEffect, useCallback } from 'react'
import { hasPermission, requestPermission, showEkadashiNotification, wasPrompted } from '@/lib/notifications'

interface EkadashiEntry {
  name: string
  date: string
  paksha: string
  month: string
  parana_start: string
  parana_end: string
  fasting_rules: string
  significance: string
}

interface EkadashiCountdownProps {
  ekadashis: EkadashiEntry[]
  labels: {
    next_ekadashi: string
    days: string
    hours: string
    minutes: string
    seconds: string
    fasting_rules: string
    parana_time: string
    significance: string
    today_is_ekadashi: string
    paksha_shukla: string
    paksha_krishna: string
    loading: string
  }
  lang: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function getNextEkadashi(ekadashis: EkadashiEntry[]): EkadashiEntry | null {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  // Find today or next
  return (
    ekadashis.find((e) => e.date >= todayStr) ?? ekadashis[ekadashis.length - 1]
  )
}

export default function EkadashiCountdown({ ekadashis, labels, lang }: EkadashiCountdownProps) {
  const next = getNextEkadashi(ekadashis)
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, isToday: false })
  const [mounted, setMounted] = useState(false)

  const compute = useCallback(() => {
    if (!next) return
    const now = new Date()
    const target = new Date(next.date + 'T00:00:00')
    const diff = target.getTime() - now.getTime()

    if (diff <= 0) {
      setTimeLeft({ d: 0, h: 0, m: 0, s: 0, isToday: true })
      if (hasPermission()) {
        showEkadashiNotification(next.name, `${next.parana_start} – ${next.parana_end}`)
      } else if (!wasPrompted()) {
        requestPermission().then((ok) => {
          if (ok) showEkadashiNotification(next.name, `${next.parana_start} – ${next.parana_end}`)
        })
      }
      return
    }
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    setTimeLeft({ d, h, m, s, isToday: false })
  }, [next])

  useEffect(() => {
    setMounted(true)
    compute()
    const id = setInterval(compute, 1000)
    return () => clearInterval(id)
  }, [compute])

  if (!next) return null

  const paksha = next.paksha === 'Shukla' ? labels.paksha_shukla : labels.paksha_krishna
  const formattedDate = new Date(next.date + 'T00:00:00').toLocaleDateString(
    lang === 'ru' ? 'ru-RU' : lang === 'hi' || lang === 'sa' ? 'hi-IN' : 'en-IN',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  )

  return (
    <div
      id="next-ekadashi-card"
      className="glass rounded-3xl overflow-hidden section-animate"
      style={{ border: '1px solid rgba(244,196,48,0.2)' }}
    >
      {/* Header */}
      <div
        className="px-6 pt-8 pb-4 text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(244,196,48,0.08) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <span
            className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{
              background: 'rgba(244,196,48,0.12)',
              border: '1px solid rgba(244,196,48,0.25)',
              color: '#F4C430',
            }}
          >
            {labels.next_ekadashi}
          </span>
        </div>

        <h2
          className="text-3xl sm:text-4xl font-bold mt-3 mb-1"
          style={{ fontFamily: 'var(--font-display)', color: '#fdf6e3' }}
        >
          {next.name}
        </h2>
        <p className="text-sm" style={{ color: 'rgba(210,180,140,0.7)' }}>
          {paksha} · {next.month} · {formattedDate}
        </p>
      </div>

      <div className="divider-saffron" />

      {/* Countdown */}
      <div className="px-6 py-8">
        {!mounted ? (
          <p className="text-center" style={{ color: 'rgba(210,180,140,0.5)' }}>
            {labels.loading}
          </p>
        ) : timeLeft.isToday ? (
          <p
            className="text-center text-2xl font-bold animate-pulse-slow"
            style={{ color: '#F4C430', fontFamily: 'var(--font-display)' }}
          >
            🪔 {labels.today_is_ekadashi}
          </p>
        ) : (
          <div className="flex items-center justify-center gap-3 sm:gap-6" id="countdown-display">
            {[
              { value: timeLeft.d, label: labels.days },
              { value: timeLeft.h, label: labels.hours },
              { value: timeLeft.m, label: labels.minutes },
              { value: timeLeft.s, label: labels.seconds },
            ].map(({ value, label }, i) => (
              <div key={label} className="flex items-center gap-3 sm:gap-6">
                <div className="countdown-segment">
                  <div className="countdown-value">{pad(value)}</div>
                  <div className="countdown-label">{label}</div>
                </div>
                {i < 3 && (
                  <span
                    className="text-2xl font-bold mb-4"
                    style={{ color: 'rgba(244,196,48,0.4)' }}
                  >
                    :
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="divider-saffron" />

      {/* Details */}
      <div className="grid sm:grid-cols-2 gap-0">
        {/* Fasting rules */}
        <div className="px-6 py-5" style={{ borderRight: '1px solid rgba(244,196,48,0.1)' }}>
          <div
            className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#F4C430' }}
          >
            <span>🌿</span> {labels.fasting_rules}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(210,180,140,0.85)' }}>
            {next.fasting_rules}
          </p>
        </div>

        {/* Parana + significance */}
        <div className="px-6 py-5">
          <div
            className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#F4C430' }}
          >
            <span>🕐</span> {labels.parana_time}
          </div>
          <p
            className="text-base font-bold mb-4"
            style={{ color: '#fdf6e3', fontFamily: 'var(--font-serif)' }}
          >
            {next.parana_start} – {next.parana_end}
          </p>
          <div
            className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#F4C430' }}
          >
            <span>📿</span> {labels.significance}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(210,180,140,0.85)' }}>
            {next.significance}
          </p>
        </div>
      </div>
    </div>
  )
}
