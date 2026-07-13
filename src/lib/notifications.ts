const PERMISSION_KEY = 'ekadashi_notif_permitted'
const EKADASHI_NOTIFIED_KEY = 'ekadashi_notified'
const PUSH_SUB_KEY = 'ekadashi_push_sub'

export const PUSH_WORKER_URL = 'https://ekadashi-push.your-subdomain.workers.dev'

function arrayBufferToUrlBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export async function requestPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false
  const result = await Notification.requestPermission()
  const permitted = result === 'granted'
  if (permitted) {
    localStorage.setItem(PERMISSION_KEY, 'true')
  }
  return permitted
}

export function hasPermission(): boolean {
  if (!isNotificationSupported()) return false
  return Notification.permission === 'granted'
}

export function wasPrompted(): boolean {
  return localStorage.getItem(PERMISSION_KEY) === 'true'
}

// ── Push subscription ──────────────────────────────────────────────────

export async function subscribeToPush(): Promise<boolean> {
  if (!hasPermission()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const resp = await fetch(`${PUSH_WORKER_URL}/vapid-public-key`)
      const { key } = await resp.json() as { key: string }
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      })
    }
    await fetch(`${PUSH_WORKER_URL}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToUrlBase64(sub.getKey('p256dh')!),
            auth: arrayBufferToUrlBase64(sub.getKey('auth')!),
          },
        },
        prefs: { ekadashiReminders: true, festivalReminders: true },
      }),
    })
    localStorage.setItem(PUSH_SUB_KEY, 'true')
    return true
  } catch {
    return false
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      const p256dh = arrayBufferToUrlBase64(sub.getKey('p256dh')!)
      await fetch(`${PUSH_WORKER_URL}/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p256dh }),
      })
      await sub.unsubscribe()
    }
    localStorage.removeItem(PUSH_SUB_KEY)
    return true
  } catch {
    return false
  }
}

export function isPushSubscribed(): boolean {
  return localStorage.getItem(PUSH_SUB_KEY) === 'true'
}

// ── Local notifications (fallback) ─────────────────────────────────────

export async function showNaamJaapReminder(mahamantra: string): Promise<void> {
  if (!hasPermission()) return
  const reg = await navigator.serviceWorker.ready
  reg.showNotification('📿 Naam Jaap Reminder', {
    body: mahamantra,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'jaap-reminder',
    vibrate: [200, 100, 200],
  } as any)
}

export async function showEkadashiNotification(name: string, parana: string): Promise<void> {
  if (!hasPermission()) return
  const today = new Date().toISOString().split('T')[0]
  if (localStorage.getItem(`${EKADASHI_NOTIFIED_KEY}_${today}`)) return
  const reg = await navigator.serviceWorker.ready
  reg.showNotification('🪔 Today is Ekadashi!', {
    body: `${name} — Parana: ${parana}. Hare Krishna!`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'ekadashi-today',
    vibrate: [300, 100, 300, 100, 300],
  } as any)
  localStorage.setItem(`${EKADASHI_NOTIFIED_KEY}_${today}`, 'true')
}

// ── Legacy jaap reminder (local setTimeout) ────────────────────────────

const JAAP_REMINDER_KEY = 'ekadashi_jaap_reminder_hour'

export function setJaapReminderHour(hour: number): void {
  localStorage.setItem(JAAP_REMINDER_KEY, String(hour))
}

export function getJaapReminderHour(): number | null {
  const val = localStorage.getItem(JAAP_REMINDER_KEY)
  return val ? parseInt(val, 10) : null
}

export function clearJaapReminderHour(): void {
  localStorage.removeItem(JAAP_REMINDER_KEY)
}

export function scheduleJaapReminder(hour: number, mahamantra: string): void {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  const msUntilReminder = target.getTime() - now.getTime()
  setTimeout(async () => {
    await showNaamJaapReminder(mahamantra)
    scheduleJaapReminder(hour, mahamantra)
  }, msUntilReminder)
  setJaapReminderHour(hour)
}
