import type { ScheduledController } from '@cloudflare/workers-types'
import webpush from 'web-push'

interface Env {
  SUBSCRIPTIONS: KVNamespace
  NOTIFICATION_LOG: KVNamespace
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
  SITE_URL: string
  CRON_SECRET: string
}

interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

interface UserPrefs {
  jaapMorning: boolean
  jaapEvening: boolean
  jaapMorningTime: string
  jaapEveningTime: string
  ekadashiReminders: boolean
  festivalReminders: boolean
  remindersBeforeDays: number
}

const DEFAULT_PREFS: UserPrefs = {
  jaapMorning: true, jaapEvening: true,
  jaapMorningTime: '06:00', jaapEveningTime: '18:00',
  ekadashiReminders: true, festivalReminders: true,
  remindersBeforeDays: 4,
}

// ── Notification content ───────────────────────────────────────────────

interface EkadashiEntry { name: string; date: string; paksha: string; month: string; parana_start: string; parana_end: string; fasting_rules: string; significance: string }
interface FestivalEntry { name: string; date: string; desc: string; emoji: string }

function diffDays(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
}

function getEkadashiAlerts(ekadashis: EkadashiEntry[], today: string): Array<{ title: string; body: string; tag: string }> {
  const out: Array<{ title: string; body: string; tag: string }> = []
  for (const e of ekadashis) {
    const d = diffDays(e.date, today)
    if (d === 4) out.push({ title: `📿 ${e.name} in 3 Days`, body: `Prepare for ${e.name} (${e.paksha} Paksha, ${e.month}).`, tag: `ek:4:${e.date}` })
    if (d === 3) out.push({ title: `📿 ${e.name} in 2 Days`, body: `${e.name} is approaching. Review fasting rules.`, tag: `ek:3:${e.date}` })
    if (d === 2) out.push({ title: `🕐 ${e.name} Tomorrow`, body: `Tomorrow is ${e.name}! Parana: ${e.parana_start} – ${e.parana_end}.`, tag: `ek:2:${e.date}` })
    if (d === 1) out.push({ title: `📿 ${e.name} Tomorrow`, body: `No grains or legumes tomorrow. Fruits, milk, nuts permitted.`, tag: `ek:1:${e.date}` })
    if (d === 0) out.push({ title: `🪔 Today is ${e.name}!`, body: `Fast today. Break fast: ${e.parana_start} – ${e.parana_end}. ${e.significance}`, tag: `ek:0:${e.date}` })
    if (d === -1) out.push({ title: `🌅 Parana Time — ${e.name}`, body: `Break your fast: ${e.parana_start} – ${e.parana_end}.`, tag: `ek:-1:${e.date}` })
  }
  return out
}

function getFestivalAlerts(festivals: FestivalEntry[], today: string): Array<{ title: string; body: string; tag: string }> {
  const out: Array<{ title: string; body: string; tag: string }> = []
  for (const f of festivals) {
    const d = diffDays(f.date, today)
    if (d === 1) out.push({ title: `⏰ ${f.name} Tomorrow`, body: f.desc, tag: `ft:1:${f.date}` })
    if (d === 0) out.push({ title: `${f.emoji} ${f.name} Today!`, body: f.desc, tag: `ft:0:${f.date}` })
  }
  return out
}

function getJaapAlerts(today: string, time: string): Array<{ title: string; body: string; tag: string }> {
  const label = time < '12:00' ? '🌅 Morning' : '🌇 Evening'
  return [{ title: `${label} Jaap Reminder`, body: 'Time for your Hare Krishna Maha-mantra japa rounds!', tag: `jp:${today}:${time}` }]
}

// ── CORS headers ───────────────────────────────────────────────────────
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)

    // GET /vapid-public-key
    if (url.pathname === '/vapid-public-key') {
      return json({ key: env.VAPID_PUBLIC_KEY })
    }

    // POST /subscribe
    if (url.pathname === '/subscribe' && request.method === 'POST') {
      try {
        const body = await request.json() as { subscription: PushSubscription; prefs?: Partial<UserPrefs> }
        if (!body.subscription?.endpoint) return json({ error: 'Invalid subscription' }, 400)
        const id = body.subscription.keys.p256dh
        await env.SUBSCRIPTIONS.put(`sub:${id}`, JSON.stringify(body.subscription))
        const prefs: UserPrefs = { ...DEFAULT_PREFS, ...(body.prefs ?? {}) }
        await env.SUBSCRIPTIONS.put(`prefs:${id}`, JSON.stringify(prefs))
        return json({ ok: true }, 201)
      } catch { return json({ error: 'Bad request' }, 400) }
    }

    // POST /unsubscribe
    if (url.pathname === '/unsubscribe' && request.method === 'POST') {
      try {
        const { p256dh } = await request.json() as { p256dh: string }
        if (!p256dh) return json({ error: 'Missing p256dh' }, 400)
        await env.SUBSCRIPTIONS.delete(`sub:${p256dh}`)
        await env.SUBSCRIPTIONS.delete(`prefs:${p256dh}`)
        return json({ ok: true })
      } catch { return json({ error: 'Bad request' }, 400) }
    }

    // GET /cron — Daily notification check
    if (url.pathname === '/cron' && request.method === 'GET') {
      if (url.searchParams.get('secret') !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401)

      const today = new Date().toISOString().split('T')[0]
      const nowTime = today + 'T' + new Date().toTimeString().slice(0, 5)

      // Fetch ekadashi data
      let ekadashis: EkadashiEntry[] = []
      try {
        const ekJson = await (await fetch(`${env.SITE_URL}/ekadashi-data.json`)).json()
        ekadashis = (ekJson as Array<{ year: number; ekadashis: EkadashiEntry[] }>).flatMap(y => y.ekadashis)
      } catch { /* will use empty array */ }

      // Fetch festival data
      let festivals: FestivalEntry[] = []
      try {
        festivals = await (await fetch(`${env.SITE_URL}/festivals-data.json`)).json() as FestivalEntry[]
      } catch { /* empty */ }

      // Generate today's alerts
      const allAlerts = [
        ...getEkadashiAlerts(ekadashis, today),
        ...getFestivalAlerts(festivals, today),
      ]
      // Add jaap alerts at specific times
      if (nowTime.endsWith('06:00')) allAlerts.push(...getJaapAlerts(today, '06:00'))
      if (nowTime.endsWith('18:00')) allAlerts.push(...getJaapAlerts(today, '18:00'))

      // Dedup against notification log
      const logKey = `sent:${today}`
      const sentTags = new Set<string>()
      try { JSON.parse(await env.NOTIFICATION_LOG.get(logKey) ?? '[]').forEach((t: string) => sentTags.add(t)) } catch { /* ignore */ }

      const newAlerts = allAlerts.filter(a => !sentTags.has(a.tag))
      if (newAlerts.length === 0) return json({ sent: 0, reason: 'nothing_new' })

      // Send to all subscribers
      let sentCount = 0
      let removedCount = 0
      const subs = await env.SUBSCRIPTIONS.list({ prefix: 'sub:' })

      for (const { name } of subs.keys) {
        const raw = await env.SUBSCRIPTIONS.get(name)
        if (!raw) continue
        const sub: PushSubscription = JSON.parse(raw)
        const id = name.replace('sub:', '')

        let prefs = DEFAULT_PREFS
        try { prefs = { ...DEFAULT_PREFS, ...JSON.parse(await env.SUBSCRIPTIONS.get(`prefs:${id}`) ?? '{}') } } catch { /* use defaults */ }

        const userAlerts = newAlerts.filter(a => {
          if (a.tag.startsWith('ek:')) return prefs.ekadashiReminders
          if (a.tag.startsWith('ft:')) return prefs.festivalReminders
          if (a.tag.startsWith('jp:')) return true
          return true
        })
        if (userAlerts.length === 0) continue

        // Send each alert as a separate push
        for (const alert of userAlerts) {
          try {
            await webpush.sendNotification(sub as any, JSON.stringify({
              title: alert.title, body: alert.body, tag: alert.tag,
              icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', vibrate: [200, 100, 200],
            }), { TTL: 86400 })
            sentCount++
          } catch (err: any) {
            if (err.statusCode === 410) {
              await env.SUBSCRIPTIONS.delete(name)
              removedCount++
            }
          }
        }
      }

      // Mark sent
      for (const a of newAlerts) sentTags.add(a.tag)
      await env.NOTIFICATION_LOG.put(logKey, JSON.stringify([...sentTags]))

      return json({ sent: sentCount, alerts: newAlerts.length, removed: removedCount })
    }

    // GET /test — Send test notification to all subscribers
    if (url.pathname === '/test' && request.method === 'GET') {
      if (url.searchParams.get('secret') !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401)

      const testAlert = { title: '🔔 Test Notification', body: 'Hare Krishna! Push notifications are working ✅', tag: `test:${Date.now()}` }
      let sentCount = 0
      const subs = await env.SUBSCRIPTIONS.list({ prefix: 'sub:' })
      for (const { name } of subs.keys) {
        const raw = await env.SUBSCRIPTIONS.get(name)
        if (!raw) continue
        try {
          await webpush.sendNotification(JSON.parse(raw) as any, JSON.stringify({
            ...testAlert, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', vibrate: [200, 100, 200],
          }), { TTL: 86400 })
          sentCount++
        } catch { /* skip */ }
      }
      return json({ sent: sentCount, subscribers: subs.keys.length })
    }

    return json({ error: 'Not found' }, 404)
  },

  async scheduled(_: ScheduledController, env: Env): Promise<void> {
    const req = new Request(`https://internal/cron?secret=${env.CRON_SECRET}`)
    await this.fetch(req, env)
  },
}
