/**
 * src/lib/notifications.ts
 * Notification utilities for Naam Jaap reminders and Ekadashi alerts.
 */

const PERMISSION_KEY = 'ekadashi_notif_permitted'
const JAAP_REMINDER_KEY = 'ekadashi_jaap_reminder_hour'
const EKADASHI_NOTIFIED_KEY = 'ekadashi_notified'

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
