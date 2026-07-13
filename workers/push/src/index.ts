import type { ScheduledController } from '@cloudflare/workers-types'

interface Env {
  SUBSCRIPTIONS: KVNamespace
  NOTIFICATION_LOG: KVNamespace
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY?: string
  VAPID_SUBJECT: string
  SITE_URL: string
  CRON_SECRET: string
}

interface PushSub {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

interface Alert {
  title: string
  body: string
  tag: string
  icon: string
  badge: string
  image: string
  vibrate: number[]
  url?: string
}

// ── Base64 utils ───────────────────────────────────────────────────────

function b64UrlToBytes(str: string): Uint8Array {
  const s = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  return Uint8Array.from(atob(s + pad), c => c.charCodeAt(0))
}

function bytesToB64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

// ── VAPID ──────────────────────────────────────────────────────────────

async function importVapidKey(privB64: string, pubB64: string): Promise<CryptoKey> {
  const priv = b64UrlToBytes(privB64)
  const pub = b64UrlToBytes(pubB64)
  const x = bytesToB64Url(pub.slice(1, 33))
  const y = bytesToB64Url(pub.slice(33, 65))
  const d = bytesToB64Url(priv)
  return crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d, x, y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

async function createVapidJWT(endpoint: string, privKeyB64: string, pubKeyB64: string, sub: string): Promise<{ jwt: string; pubKeyB64: string }> {
  const header = bytesToB64Url(strToBytes(JSON.stringify({ alg: 'ES256', typ: 'JWT' })))
  const now = Math.floor(Date.now() / 1000)
  const payload = bytesToB64Url(strToBytes(JSON.stringify({ aud: new URL(endpoint).origin, exp: now + 43200, sub })))
  const signingInput = strToBytes(`${header}.${payload}`)
  const pk = await importVapidKey(privKeyB64, pubKeyB64)
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pk, signingInput))
  return { jwt: `${header}.${payload}.${bytesToB64Url(sig)}`, pubKeyB64 }
}

// ── Send empty push (no encryption needed) ─────────────────────────────

async function sendEmptyPush(sub: PushSub, env: Env): Promise<void> {
  if (!env.VAPID_PRIVATE_KEY) throw new Error('VAPID_PRIVATE_KEY not set')
  const vapidPubB64 = bytesToB64Url(b64UrlToBytes(env.VAPID_PUBLIC_KEY))
  const vapid = await createVapidJWT(sub.endpoint, env.VAPID_PRIVATE_KEY, vapidPubB64, env.VAPID_SUBJECT)
  const resp = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${vapid.jwt}, k=${vapid.pubKeyB64}`,
      'TTL': '86400',
    },
  })
  if (resp.status === 410) throw { statusCode: 410, message: 'Subscription expired' }
  if (!resp.ok) throw new Error(`Push failed: ${resp.status} ${await resp.text().catch(() => '')}`)
}

// ── Notification content ───────────────────────────────────────────────

interface EkadashiEntry { name: string; date: string; paksha: string; month: string; parana_start: string; parana_end: string; fasting_rules: string; significance: string }
interface FestivalEntry { name: string; date: string; desc: string; emoji: string }

function diffDays(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
}

function mkAlert(title: string, body: string, tag: string): Alert {
  return { title, body, tag, icon: '/icons/icon-192.png', badge: '/icons/badge.png', image: '/icons/icon-512.png', vibrate: [200, 100, 200], url: '/' }
}

function getEkadashiAlerts(ekadashis: EkadashiEntry[], today: string): Alert[] {
  const out: Alert[] = []
  for (const e of ekadashis) {
    const d = diffDays(e.date, today)
    if (d === 4) out.push(mkAlert(`📿 ${e.name} in 3 Days`, `Prepare for ${e.name} (${e.paksha} Paksha, ${e.month}).`, `ek:4:${e.date}`))
    if (d === 3) out.push(mkAlert(`📿 ${e.name} in 2 Days`, `${e.name} is approaching. Review fasting rules.`, `ek:3:${e.date}`))
    if (d === 2) out.push(mkAlert(`🕐 ${e.name} Tomorrow`, `Tomorrow is ${e.name}! Parana: ${e.parana_start} – ${e.parana_end}.`, `ek:2:${e.date}`))
    if (d === 1) out.push(mkAlert(`📿 ${e.name} Tomorrow`, `No grains or legumes tomorrow. Fruits, milk, nuts permitted.`, `ek:1:${e.date}`))
    if (d === 0) out.push(mkAlert(`🪔 Today is ${e.name}!`, `Fast today. Break fast: ${e.parana_start} – ${e.parana_end}. ${e.significance}`, `ek:0:${e.date}`))
    if (d === -1) out.push(mkAlert(`🌅 Parana Time — ${e.name}`, `Break your fast: ${e.parana_start} – ${e.parana_end}.`, `ek:-1:${e.date}`))
  }
  return out
}

function getFestivalAlerts(festivals: FestivalEntry[], today: string): Alert[] {
  const out: Alert[] = []
  for (const f of festivals) {
    const d = diffDays(f.date, today)
    if (d === 1) out.push(mkAlert(`⏰ ${f.name} Tomorrow`, f.desc, `ft:1:${f.date}`))
    if (d === 0) out.push(mkAlert(`${f.emoji} ${f.name} Today!`, f.desc, `ft:0:${f.date}`))
  }
  return out
}

function getJaapAlerts(today: string, time: string): Alert[] {
  const label = time < '12:00' ? '🌅 Morning' : '🌇 Evening'
  return [mkAlert(`${label} Jaap Reminder`, 'Time for your Hare Krishna Maha-mantra japa rounds!', `jp:${today}:${time}`)]
}

// ── Helpers ────────────────────────────────────────────────────────────

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

const DEFAULT_PREFS = { jaapMorning: true, jaapEvening: true, jaapMorningTime: '06:00', jaapEveningTime: '18:00', ekadashiReminders: true, festivalReminders: true, remindersBeforeDays: 4 }

const CURRENT_ALERTS_KEY = 'current_alerts'

// ── Main handler ───────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    // GET /vapid-public-key
    if (url.pathname === '/vapid-public-key') {
      return json({ key: env.VAPID_PUBLIC_KEY })
    }

    // GET /current-alerts — SW fetches this on empty push
    if (url.pathname === '/current-alerts') {
      const raw = await env.NOTIFICATION_LOG.get(CURRENT_ALERTS_KEY)
      return json(raw ? JSON.parse(raw) : [])
    }

    // POST /subscribe
    if (url.pathname === '/subscribe' && request.method === 'POST') {
      try {
        const body = await request.json() as { subscription: PushSub; prefs?: any }
        if (!body.subscription?.endpoint) return json({ error: 'Invalid subscription' }, 400)
        const id = body.subscription.keys.p256dh
        await env.SUBSCRIPTIONS.put(`sub:${id}`, JSON.stringify(body.subscription))
        const prefs = { ...DEFAULT_PREFS, ...(body.prefs ?? {}) }
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

    // GET /debug
    if (url.pathname === '/debug') {
      if (url.searchParams.get('secret') !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401)
      const subCount = (await env.SUBSCRIPTIONS.list({ prefix: 'sub:' })).keys.length
      return json({
        vapid: { publicKey: !!env.VAPID_PUBLIC_KEY, privateKey: !!env.VAPID_PRIVATE_KEY, subject: !!env.VAPID_SUBJECT },
        subscribers: subCount, siteUrl: env.SITE_URL,
      })
    }

    // GET /test — send test notification (no encryption)
    if (url.pathname === '/test') {
      if (url.searchParams.get('secret') !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401)
      if (!env.VAPID_PRIVATE_KEY) return json({ error: 'VAPID_PRIVATE_KEY not set' }, 500)

      const testAlert: Alert = {
        title: '🔔 Test Notification',
        body: 'Hare Krishna! Push working ✅',
        tag: 'test-' + Date.now(),
        icon: '/icons/icon-192.png',
        badge: '/icons/badge.png',
        image: '/icons/icon-512.png',
        vibrate: [200, 100, 200],
      }
      await env.NOTIFICATION_LOG.put(CURRENT_ALERTS_KEY, JSON.stringify([testAlert]))

      let sent = 0
      const errors: string[] = []
      const subs = await env.SUBSCRIPTIONS.list({ prefix: 'sub:' })

      for (const { name } of subs.keys) {
        const raw = await env.SUBSCRIPTIONS.get(name)
        if (!raw) continue
        try {
          await sendEmptyPush(JSON.parse(raw) as PushSub, env)
          sent++
        } catch (err: any) {
          if (err.statusCode === 410) {
            await env.SUBSCRIPTIONS.delete(name)
            errors.push(`${name.slice(0, 12)}...: unsubscribed (410)`)
          } else {
            errors.push(`${name.slice(0, 12)}...: ${err.message || err}`)
          }
        }
      }

      setTimeout(() => env.NOTIFICATION_LOG.delete(CURRENT_ALERTS_KEY).catch(() => {}), 0)
      return json({ sent, subscribers: subs.keys.length, errors: errors.length ? errors : undefined })
    }

    // GET /test-ping — send EMPTY push (no encryption, no KV)
    if (url.pathname === '/test-ping') {
      if (url.searchParams.get('secret') !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401)
      if (!env.VAPID_PRIVATE_KEY) return json({ error: 'VAPID_PRIVATE_KEY not set' }, 500)

      let sent = 0
      const errors: string[] = []
      const subs = await env.SUBSCRIPTIONS.list({ prefix: 'sub:' })

      for (const { name } of subs.keys) {
        const raw = await env.SUBSCRIPTIONS.get(name)
        if (!raw) continue
        const sub: PushSub = JSON.parse(raw)
        try {
          await sendEmptyPush(sub, env)
          sent++
        } catch (err: any) {
          if (err.statusCode === 410) { await env.SUBSCRIPTIONS.delete(name); errors.push(`${name.slice(0, 12)}...: unsubscribed (410)`); continue }
          errors.push(`${name.slice(0, 12)}...: ${err.message || err}`)
        }
      }
      return json({ sent, subscribers: subs.keys.length, errors: errors.length ? errors : undefined })
    }

    // GET /cron — daily notification check
    if (url.pathname === '/cron') {
      if (url.searchParams.get('secret') !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401)

      const today = new Date().toISOString().split('T')[0]
      const nowTime = today + 'T' + new Date().toTimeString().slice(0, 5)

      let ekadashis: EkadashiEntry[] = []
      try { ekadashis = (await (await fetch(`${env.SITE_URL}/ekadashi-data.json`)).json() as Array<{ year: number; ekadashis: EkadashiEntry[] }>).flatMap(y => y.ekadashis) } catch { /* empty */ }
      let festivals: FestivalEntry[] = []
      try { festivals = await (await fetch(`${env.SITE_URL}/festivals-data.json`)).json() as FestivalEntry[] } catch { /* empty */ }

      const allAlerts = [
        ...getEkadashiAlerts(ekadashis, today),
        ...getFestivalAlerts(festivals, today),
        ...getJaapAlerts(today, '06:00'),
        ...getJaapAlerts(today, '18:00'),
      ]

      const logKey = `sent:${today}`
      const sentTags = new Set<string>()
      try { JSON.parse((await env.NOTIFICATION_LOG.get(logKey)) || '[]').forEach((t: string) => sentTags.add(t)) } catch { /* ignore */ }

      const newAlerts = allAlerts.filter(a => !sentTags.has(a.tag))
      if (newAlerts.length === 0) return json({ sent: 0, reason: 'nothing_new' })

      await env.NOTIFICATION_LOG.put(CURRENT_ALERTS_KEY, JSON.stringify(newAlerts))

      let sentCount = 0, removedCount = 0
      const subs = await env.SUBSCRIPTIONS.list({ prefix: 'sub:' })

      for (const { name } of subs.keys) {
        const raw = await env.SUBSCRIPTIONS.get(name)
        if (!raw) continue
        const sub: PushSub = JSON.parse(raw)
        const id = name.replace('sub:', '')
        let prefs = DEFAULT_PREFS
        try { prefs = { ...DEFAULT_PREFS, ...JSON.parse((await env.SUBSCRIPTIONS.get(`prefs:${id}`)) || '{}') } } catch { /* use defaults */ }

        const userAlerts = newAlerts.filter(a => {
          if (a.tag.startsWith('ek:')) return prefs.ekadashiReminders
          if (a.tag.startsWith('ft:')) return prefs.festivalReminders
          if (a.tag.startsWith('jp:') && a.tag.endsWith('06:00')) return prefs.jaapMorning
          if (a.tag.startsWith('jp:') && a.tag.endsWith('18:00')) return prefs.jaapEvening
          return true
        })
        if (userAlerts.length === 0) continue

        try {
          await sendEmptyPush(sub, env)
          sentCount++
        } catch (err: any) {
          if (err.statusCode === 410) { await env.SUBSCRIPTIONS.delete(name); removedCount++ }
        }
      }

      for (const a of newAlerts) sentTags.add(a.tag)
      await env.NOTIFICATION_LOG.put(logKey, JSON.stringify([...sentTags]))
      return json({ sent: sentCount, alerts: newAlerts.length, removed: removedCount })
    }

    return json({ error: 'Not found' }, 404)
  },

  async scheduled(_: ScheduledController, env: Env): Promise<void> {
    const req = new Request(`https://internal/cron?secret=${env.CRON_SECRET}`)
    await this.fetch(req, env)
  },
}
