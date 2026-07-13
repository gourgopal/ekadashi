import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

function crc32(buf) {
  let crc = 0xffffffff;
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, typeB, data, crcB]);
}

function createPNG(width, height, pixels) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    pixels.copy(raw, y * (1 + width * 4) + 1, y * width * 4);
  }
  const compressed = deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
}

const S = 96;
const pixels = Buffer.alloc(S * S * 4, 0);

function setP(x, y) {
  if (x < 0 || x >= S || y < 0 || y >= S) return;
  const i = (y * S + x) * 4;
  pixels[i] = 255; pixels[i+1] = 255; pixels[i+2] = 255; pixels[i+3] = 255;
}

// Gaudiya Vaishnava tilak (Urdhva Pundra):
// Two vertical white lines (feet of Lord Krishna)
// Connected at top by a tulsi-leaf-like shape (or rounded bridge)

const cx1 = 32, cx2 = 64; // centers of left and right lines
const halfW = 5;           // half-width of each line

// Left vertical line
for (let y = 14; y <= 82; y++) {
  for (let x = cx1 - halfW; x <= cx1 + halfW; x++) {
    // Slight taper at bottom
    const distFromBottom = 82 - y;
    const taper = Math.max(0, Math.min(halfW, Math.floor(distFromBottom / 6)));
    if (x >= cx1 - halfW + taper && x <= cx1 + halfW - taper) setP(x, y);
  }
}

// Right vertical line
for (let y = 14; y <= 82; y++) {
  for (let x = cx2 - halfW; x <= cx2 + halfW; x++) {
    const distFromBottom = 82 - y;
    const taper = Math.max(0, Math.min(halfW, Math.floor(distFromBottom / 6)));
    if (x >= cx2 - halfW + taper && x <= cx2 + halfW - taper) setP(x, y);
  }
}

// Tulsi leaf / rounded top connecting the two lines
// Ellipse shape bridging from cx1 to cx2 at the top
const topY = 8;
for (let y = topY; y <= topY + 14; y++) {
  for (let x = cx1 - 3; x <= cx2 + 3; x++) {
    // Ellipse: (x - cxMid)^2 / a^2 + (y - topY)^2 / b^2 <= 1
    const cxMid = (cx1 + cx2) / 2;
    const a = (cx2 - cx1) / 2 + 4; // horizontal radius
    const b = 7;                    // vertical radius
    const dx = (x - cxMid) / a;
    const dy = (y - (topY + b)) / b;
    if (dx * dx + dy * dy <= 1.0) setP(x, y);
  }
}

// Small bindu (dot) above the center of the leaf
const dotY = 5;
for (let y = dotY - 2; y <= dotY + 2; y++) {
  for (let x = 46; x <= 50; x++) {
    const dx = x - 48, dy = y - dotY;
    if (dx * dx + dy * dy <= 4) setP(x, y);
  }
}

const png = createPNG(S, S, pixels);
writeFileSync('public/icons/badge.png', png);
console.log('Generated tilak badge: public/icons/badge.png');
