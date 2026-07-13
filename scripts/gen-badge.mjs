import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

function crc32(b) {
  let c = 0xffffffff;
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) { let x = i; for (let j = 0; j < 8; j++) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1; t[i] = x; }
  for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(t, d) {
  const l = Buffer.alloc(4); l.writeUInt32BE(d.length);
  const tb = Buffer.from(t, 'ascii');
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([tb, d])));
  return Buffer.concat([l, tb, d, cr]);
}
function png(w, h, px) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) { raw[y * (1 + w * 4)] = 0; px.copy(raw, y * (1 + w * 4) + 1, y * w * 4); }
  const z = deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', Buffer.alloc(0))]);
}

// Render at 8x then downscale for AA
const S = 8, N = 96, R = N * S;
const px = new Uint8Array(R * R * 4);

function fill(x, y, r) {
  const ir = Math.ceil(r);
  for (let dy = -ir; dy <= ir; dy++) for (let dx = -ir; dx <= ir; dx++) {
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d > r) continue;
    const cx = Math.round(x + dx), cy = Math.round(y + dy);
    if (cx < 0 || cx >= R || cy < 0 || cy >= R) continue;
    const i = (cy * R + cx) * 4;
    const a = Math.round(Math.max(0, Math.min(255, (r - d) * 255 / r)));
    if (a > px[i + 3]) { px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; px[i + 3] = a; }
  }
}

// Evaluate cubic bezier at t
function cbez(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

// Draw a tapered thick curve along a cubic bezier path
function taper(x0, y0, x1, y1, x2, y2, x3, y3, w0, w1, steps = 120) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = cbez(t, x0, x1, x2, x3);
    const cy = cbez(t, y0, y1, y2, y3);
    const w = w0 * (1 - t*t) + w1 * t*t;
    fill(cx, cy, w / 2);
  }
}

// ===== BOLD TILAK with curved lines =====
// Two thick vertical strokes with gentle outward curve, tapering at bottom

// Left line — bolder, wider
taper(
  33*S, 16*S,  // top center
  29*S, 38*S,  // control 1 (outward)
  29*S, 60*S,  // control 2
  33*S, 84*S,  // bottom center
  14*S, 7*S    // width at top, width at bottom
);

// Right line — mirror
taper(
  63*S, 16*S,
  67*S, 38*S,
  67*S, 60*S,
  63*S, 84*S,
  14*S, 7*S
);

// Tulsi leaf at top — thick pointed oval shape
// Left half: sweep from center to left edge
for (let i = 0; i <= 80; i++) {
  const t = i / 80;
  const lx = cbez(t, 48*S, 38*S, 34*S, 34*S);
  const ly = cbez(t, 18*S, 8*S, 8*S, 18*S);
  fill(lx, ly, 8*S);
}
// Right half
for (let i = 0; i <= 80; i++) {
  const t = i / 80;
  const lx = cbez(t, 48*S, 58*S, 62*S, 62*S);
  const ly = cbez(t, 18*S, 8*S, 8*S, 18*S);
  fill(lx, ly, 8*S);
}
// Fill leaf center area
for (let i = 0; i <= 60; i++) {
  const t = i / 60;
  const lx = cbez(t, 48*S, 48*S, 48*S, 48*S);
  const ly = cbez(t, 16*S, 10*S, 10*S, 16*S);
  fill(lx, ly, 10*S);
}

// Bindu
fill(48*S, 5*S, 5*S);

// ===== DOWNSAMPLE =====
const out = Buffer.alloc(N * N * 4);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  let r = 0, g = 0, b = 0, a = 0, c = 0;
  for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
    const i = ((y * S + sy) * R + (x * S + sx)) * 4;
    if (px[i + 3] > 0) { r += px[i]; g += px[i+1]; b += px[i+2]; a += px[i+3]; c++; }
  }
  const o = (y * N + x) * 4;
  if (c) { out[o] = r / c; out[o+1] = g / c; out[o+2] = b / c; out[o+3] = a / c; }
}
writeFileSync('public/icons/badge.png', png(N, N, out));
console.log('badge.png generated (bold tilak)');

// ===== LANDSCAPE BANNER =====
const W = 1200, H = 600;
const bp = Buffer.alloc(W * H * 4);

// Saffron gradient — warm orange to golden
for (let y = 0; y < H; y++) {
  const t = y / H;
  const rr = Math.round(245 - t * 15 + Math.sin(y * 0.003) * 4);
  const gg = Math.round(140 + t * 35 + Math.sin(y * 0.003) * 3);
  const bb = Math.round(25 + t * 15);
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const vy = 1 - 0.15 * Math.abs(x / W - 0.5) * 2;
    bp[i] = Math.round(rr * vy);
    bp[i+1] = Math.round(gg * vy);
    bp[i+2] = Math.round(bb * vy);
    bp[i+3] = 255;
  }
}

// Bold tilak watermark
function wdot(x, y, r, a) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d > r) continue;
    const cx = Math.round(x + dx), cy = Math.round(y + dy);
    if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
    const i = (cy * W + cx) * 4;
    const alpha = Math.round(Math.max(0, Math.min(255, a * (r - d) / r)));
    if (alpha > 0) {
      const f = alpha / 255;
      bp[i] = Math.round(bp[i] * (1 - f) + 255 * f);
      bp[i+1] = Math.round(bp[i+1] * (1 - f) + 255 * f);
      bp[i+2] = Math.round(bp[i+2] * (1 - f) + 255 * f);
    }
  }
}

// Bold watermark tilak
const mX = W/2, s = 1.2;
// Left line
for (let i = 0; i <= 80; i++) {
  const t = i / 80;
  const lx = cbez(t, mX - 50*s, mX - 50*s - 20*s, mX - 50*s - 20*s, mX - 50*s);
  const ly = cbez(t, 30*s, 30*s + 100*s, 30*s + 200*s, 30*s + 340*s);
  const w = 30*s - 15*s * t*t;
  wdot(lx, ly, w * 0.5, 28);
}
// Right line
for (let i = 0; i <= 80; i++) {
  const t = i / 80;
  const lx = cbez(t, mX + 50*s, mX + 50*s + 20*s, mX + 50*s + 20*s, mX + 50*s);
  const ly = cbez(t, 30*s, 30*s + 100*s, 30*s + 200*s, 30*s + 340*s);
  const w = 30*s - 15*s * t*t;
  wdot(lx, ly, w * 0.5, 28);
}
// Leaf
for (let i = 0; i <= 60; i++) {
  const t = i / 60;
  const lx = cbez(t, mX, mX - 60*s, mX - 80*s, mX - 80*s);
  const ly = cbez(t, 30*s - 30*s, 30*s - 50*s, 30*s - 50*s, 30*s - 30*s + 30*s);
  wdot(lx, ly, 15*s, 28);
  const rx = cbez(t, mX, mX + 60*s, mX + 80*s, mX + 80*s);
  wdot(rx, ly, 15*s, 28);
}
// Leaf fill
for (let i = 0; i <= 40; i++) {
  const t = i / 40;
  const ly = cbez(t, 30*s - 30*s, 30*s - 15*s, 30*s - 15*s, 30*s);
  wdot(mX, ly, 25*s, 28);
}
// Bindu
wdot(mX, 30*s - 45*s, 10*s, 28);

writeFileSync('public/icons/notification-banner.png', png(W, H, bp));
console.log('notification-banner.png generated');
