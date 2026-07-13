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

// Render at 8x then downscale for extreme AA
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

function rect(cx, cy, w, h, rx) {
  // Rounded rectangle via super-sampling
  const hl = w/2, vl = h/2;
  for (let y = cy - vl - rx; y <= cy + vl + rx; y++) for (let x = cx - hl - rx; x <= cx + hl + rx; x++) {
    if (x < 0 || x >= R || y < 0 || y >= R) continue;
    const dx = Math.abs(x - cx) - hl + rx;
    const dy = Math.abs(y - cy) - vl + rx;
    const d = dx > 0 && dy > 0 ? Math.sqrt(dx*dx + dy*dy) : Math.max(dx, dy, 0);
    if (d > rx) continue;
    const i = (y * R + x) * 4;
    const a = Math.round(Math.max(0, Math.min(255, (rx - d) * 255 / rx)));
    if (a > px[i + 3]) { px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; px[i + 3] = a; }
  }
}

// ===== BOLD, CLEAN TILAK =====
// Using thick shapes that are recognizable at small sizes

// Left line: tall rounded rect, slightly tapered
const lx = 33, rw = 7.5;
// Upper segment
rect(lx, 36, rw, 50, 3.5);
// Lower taper
for (let y = 60; y < 80; y++) {
  const t = (y - 60) / 20;
  const w2 = rw * (1 - t * 0.35);
  fill(lx, y, w2 / 2);
}

// Right line
const rx2 = 63;
rect(rx2, 36, rw, 50, 3.5);
for (let y = 60; y < 80; y++) {
  const t = (y - 60) / 20;
  const w2 = rw * (1 - t * 0.35);
  fill(rx2, y, w2 / 2);
}

// Tulsi leaf at top: diamond/oval shape
for (let y = 10; y <= 32; y++) {
  const t = (y - 10) / 22;
  // Leaf width varies from 0 at tip to max at center to 0 at bottom
  const lw = Math.sin(t * Math.PI) * 20;
  fill(48, y, lw / 2);
}

// Bindu
fill(48, 5, 3.2);

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
console.log('badge.png generated (8x supersampled)');

// ===== LANDSCAPE BANNER =====
const W = 1200, H = 600;
const bp = Buffer.alloc(W * H * 4);

// Saffron gradient with subtle vignette
for (let y = 0; y < H; y++) {
  const t = y / H;
  const rr = Math.round(245 - t * 15 + Math.sin(y * 0.005) * 3);
  const gg = Math.round(140 + t * 35 + Math.sin(y * 0.005) * 2);
  const bb = Math.round(25 + t * 15);
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const vignette = 1 - 0.2 * Math.abs(x / W - 0.5) * 2;
    bp[i] = Math.round(rr * vignette);
    bp[i+1] = Math.round(gg * vignette);
    bp[i+2] = Math.round(bb * vignette);
    bp[i+3] = 255;
  }
}

// Large tilak watermark
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

// Bold watermark tilak in center
const mX = W / 2;
// Left line
for (let y = 100; y < 460; y++) {
  const t = (y - 100) / 360;
  const w2 = 28 * (1 - t * 0.3);
  wdot(mX - 60, y, w2, 25);
}
// Right line
for (let y = 100; y < 460; y++) {
  const t = (y - 100) / 360;
  const w2 = 28 * (1 - t * 0.3);
  wdot(mX + 60, y, w2, 25);
}
// Leaf
for (let y = 45; y <= 140; y++) {
  const t = (y - 45) / 95;
  const lw = Math.sin(t * Math.PI) * 50;
  wdot(mX, y, lw / 2, 25);
}
// Bindu
wdot(mX, 28, 12, 25);

writeFileSync('public/icons/notification-banner.png', png(W, H, bp));
console.log('notification-banner.png generated');
