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

// Render at 4x then downscale for AA
const S = 4, N = 96, R = N * S;
const px = new Uint8Array(R * R * 4);

function setP(x, y, a) {
  if (x < 0 || x >= R || y < 0 || y >= R) return;
  const i = (y * R + x) * 4;
  if (a > px[i + 3]) { px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; px[i + 3] = a; }
}

function drawDisk(cx, cy, r) {
  const ir = Math.ceil(r);
  for (let dy = -ir; dy <= ir; dy++) for (let dx = -ir; dx <= ir; dx++) {
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d > r) continue;
    const a = Math.round(Math.max(0, Math.min(255, (r - d) * 255 / r)));
    setP(Math.round(cx + dx), Math.round(cy + dy), a);
  }
}

// Cubic bezier
function cbez(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

// Draw a tapered thick bezier curve by sweeping disks along centerline
function taperc(x0, y0, cx1, cy1, cx2, cy2, x3, y3, w0, w1, steps = 120) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = cbez(t, x0, cx1, cx2, x3);
    const y = cbez(t, y0, cy1, cy2, y3);
    const w = w0 * (1 - t*t) + w1 * t*t; // quadratic taper
    drawDisk(x, y, w / 2);
  }
}

// === Urdhva Pundra tilak ===
// Left vertical line — centerline with slight outward curve, tapering bottom
taperc(
  33*S, 13*S,  // top center
  30*S, 35*S,  // control 1 (outward)
  30*S, 60*S,  // control 2
  33*S, 80*S,  // bottom center
  8*S, 3.5*S   // width at top, width at bottom
);

// Right vertical line
taperc(
  63*S, 13*S,
  66*S, 35*S,
  66*S, 60*S,
  63*S, 80*S,
  8*S, 3.5*S
);

// Tulsi leaf at top — two halves sweeping from center
// Left half of leaf
for (let i = 0; i <= 60; i++) {
  const t = i / 60;
  const lx = cbez(t, 48*S, 38*S, 34*S, 34*S);
  const ly = cbez(t, 17*S, 8*S, 8*S, 17*S);
  drawDisk(lx, ly, 3.5*S);
}
// Right half of leaf
for (let i = 0; i <= 60; i++) {
  const t = i / 60;
  const lx = cbez(t, 48*S, 58*S, 62*S, 62*S);
  const ly = cbez(t, 17*S, 8*S, 8*S, 17*S);
  drawDisk(lx, ly, 3.5*S);
}
// Fill leaf center
taperc(48*S, 16*S, 48*S, 10*S, 48*S, 10*S, 48*S, 16*S, 4*S, 4*S);

// Bindu dot above
drawDisk(48*S, 3.5*S, 2.5*S);

// Downscale to 96x96 with anti-aliasing
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
console.log('badge.png generated');

// === Landscape notification banner (1200x600) ===
const W = 1200, H = 600;
const bp = Buffer.alloc(W * H * 4);

// Saffron gradient — warm orange top to golden bottom
for (let y = 0; y < H; y++) {
  const t = y / H;
  const rr = Math.round(245 - t * 15);
  const gg = Math.round(140 + t * 35);
  const bb = Math.round(25 + t * 15);
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    bp[i] = rr; bp[i+1] = gg; bp[i+2] = bb; bp[i+3] = 255;
  }
}

// Subtle tilak watermark
function wdot(x, y, r, a) {
  const ir = Math.ceil(r);
  for (let dy = -ir; dy <= ir; dy++) for (let dx = -ir; dx <= ir; dx++) {
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

// Large white tilak watermark at 20% opacity
const mW = W / 2, mH = H / 2;
const wmS = 1.5;
const ws = 30 * wmS;
for (let i = 0; i <= 80; i++) {
  const t = i / 80;
  const w = (ws - ws * 0.35 * t*t);
  // Left line watermark
  const lx = cbez(t, mW - wmS*50, mW - wmS*50 - wmS*20, mW - wmS*50 - wmS*20, mW - wmS*50);
  const ly = cbez(t, mH - wmS*80, mH - wmS*20, mH + wmS*20, mH + wmS*80);
  wdot(lx, ly, w * 0.4, 30);
  // Right line watermark
  const rx = cbez(t, mW + wmS*50, mW + wmS*50 + wmS*20, mW + wmS*50 + wmS*20, mW + wmS*50);
  const ry = cbez(t, mH - wmS*80, mH - wmS*20, mH + wmS*20, mH + wmS*80);
  wdot(rx, ry, w * 0.4, 30);
}
// Leaf watermark
for (let i = 0; i <= 40; i++) {
  const t = i / 40;
  const lx = cbez(t, mW, mW - wmS*35, mW - wmS*48, mW - wmS*48);
  const ly = cbez(t, mH - wmS*80, mH - wmS*95, mH - wmS*95, mH - wmS*80);
  wdot(lx, ly, 6, 20);
  const rx = cbez(t, mW, mW + wmS*35, mW + wmS*48, mW + wmS*48);
  const ry = cbez(t, mH - wmS*80, mH - wmS*95, mH - wmS*95, mH - wmS*80);
  wdot(rx, ry, 6, 20);
}
// Bindu watermark
wdot(mW, mH - wmS*95, 6, 20);

writeFileSync('public/icons/notification-banner.png', png(W, H, bp));
console.log('notification-banner.png generated');
