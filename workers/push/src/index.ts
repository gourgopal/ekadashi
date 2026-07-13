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
  const priv = b64UrlToBytes(privB64)       // 32 raw bytes
  const pub = b64UrlToBytes(pubB64)          // 65 raw bytes: 0x04 || x(32) || y(32)
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

// ── Encryption ─────────────────────────────────────────────────────────

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

async function encryptPayload(payload: string, sub: PushSub): Promise<{ body: Uint8Array; salt: string; pubKey: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  // Import client's p256dh key (raw uncompressed 65-byte format) as JWK
  const rawP256dh = b64UrlToBytes(sub.keys.p256dh)
  const clientPub = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256',
    x: bytesToB64Url(rawP256dh.slice(1, 33)),
    y: bytesToB64Url(rawP256dh.slice(33, 65)),
    ext: true,
  }, { name: 'ECDH', namedCurve: 'P-256' }, true, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPub }, serverKeys.privateKey, 256))
  const auth = b64UrlToBytes(sub.keys.auth)
  // Export server public key as raw uncompressed format (matching client's format)
  const serverJwk = await crypto.subtle.exportKey('jwk', serverKeys.publicKey) as any
  const serverPubRaw = new Uint8Array(65)
  serverPubRaw[0] = 0x04
  serverPubRaw.set(b64UrlToBytes(serverJwk.x), 1)
  serverPubRaw.set(b64UrlToBytes(serverJwk.y), 33)

  // PRK = HMAC-SHA256(auth, shared)
  const prk = await hmac(auth, shared)

  // Context = "WebPush: info" || 0x00 || clientAuth || serverPub
  const context = new Uint8Array([...strToBytes('WebPush: info'), 0x00, ...auth, ...serverPubRaw])

  // CEK derivation
  const cekInfo = new Uint8Array([...strToBytes('Content-Encoding: aes128gcm\x00'), ...context])
  const cekPrk = await hmac(cekInfo, prk)
  const cek = cekPrk.slice(0, 16)

  // Nonce derivation
  const nonceInfo = new Uint8Array([...strToBytes('Content-Encoding: nonce\x00'), ...context])
  const noncePrk = await hmac(nonceInfo, prk)
  const nonce = noncePrk.slice(0, 12)

  const plaintext = new Uint8Array([0, ...strToBytes(payload)])
  const encKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: new Uint8Array(0), tagLength: 128 }, encKey, plaintext))

  // Build aes128gcm record: salt(16) || recordSize(4) || pubKeyLen(1) || pubKey(variable) || ciphertext
  const recordSize = new Uint8Array([0x00, 0x00, 0x10, 0x00]) // 4096
  const body = new Uint8Array([...salt, ...recordSize, serverPubRaw.length, ...serverPubRaw, ...encrypted])

  return { body, salt: bytesToB64Url(salt), pubKey: bytesToB64Url(serverPubRaw) }
}

// ── Send push via fetch ────────────────────────────────────────────────

async function sendPush(sub: PushSub, payload: string, env: Env): Promise<void> {
  if (!env.VAPID_PRIVATE_KEY) throw new Error('VAPID_PRIVATE_KEY not set')
  const enc = await encryptPayload(payload, sub)
  const vapidPubB64 = bytesToB64Url(b64UrlToBytes(env.VAPID_PUBLIC_KEY))
  const vapid = await createVapidJWT(sub.endpoint, env.VAPID_PRIVATE_KEY, vapidPubB64, env.VAPID_SUBJECT)
  const resp = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      'Content-Encoding': 'aes128gcm',
      'Encryption': `salt=${enc.salt}`,
      'Crypto-Key': `dh=${enc.pubKey};p256ecdsa=${vapid.pubKeyB64}`,
      'Authorization': `vapid t=${vapid.jwt}, k=${vapid.pubKeyB64}`,
      'TTL': '86400',
    },
    body: enc.body,
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

// ── Main handler ───────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    // GET /vapid-public-key
    if (url.pathname === '/vapid-public-key') {
      return json({ key: env.VAPID_PUBLIC_KEY })
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

    // GET /test — send test to all subscribers
    if (url.pathname === '/test') {
      if (url.searchParams.get('secret') !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401)
      if (!env.VAPID_PRIVATE_KEY) return json({ error: 'VAPID_PRIVATE_KEY not set' }, 500)

      const testPayload = JSON.stringify({
        title: '🔔 Test Notification', body: 'Hare Krishna! Push working ✅',
        tag: 'test-' + Date.now(), icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
      })
      let sent = 0
      const errors: string[] = []
      const subs = await env.SUBSCRIPTIONS.list({ prefix: 'sub:' })

      for (const { name } of subs.keys) {
        const raw = await env.SUBSCRIPTIONS.get(name)
        if (!raw) continue
        try {
          await sendPush(JSON.parse(raw) as PushSub, testPayload, env)
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
      ]
      if (nowTime.endsWith('06:00')) allAlerts.push(...getJaapAlerts(today, '06:00'))
      if (nowTime.endsWith('18:00')) allAlerts.push(...getJaapAlerts(today, '18:00'))

      const logKey = `sent:${today}`
      const sentTags = new Set<string>()
      try { JSON.parse((await env.NOTIFICATION_LOG.get(logKey)) || '[]').forEach((t: string) => sentTags.add(t)) } catch { /* ignore */ }

      const newAlerts = allAlerts.filter(a => !sentTags.has(a.tag))
      if (newAlerts.length === 0) return json({ sent: 0, reason: 'nothing_new' })

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
          return true
        })
        if (userAlerts.length === 0) continue

        for (const alert of userAlerts) {
          try {
            const payload = JSON.stringify({ title: alert.title, body: alert.body, tag: alert.tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', vibrate: [200, 100, 200] })
            await sendPush(sub, payload, env)
            sentCount++
          } catch (err: any) {
            if (err.statusCode === 410) { await env.SUBSCRIPTIONS.delete(name); removedCount++ }
          }
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
