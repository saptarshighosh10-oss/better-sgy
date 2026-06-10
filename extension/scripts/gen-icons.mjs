// Dependency-free icon generator for Better SGY.
// Renders a rounded-square indigo→violet tile with a white upward "level-up"
// chevron, supersampled 4× for smooth edges, and writes public/icon/{16,32,48,128}.png.
// Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, '..', 'public', 'icon');
mkdirSync(OUT, { recursive: true });

// ---- brand palette ----
const TOP = [124, 108, 252];  // #7C6CFC indigo
const BOT = [91, 61, 240];    // #5B3DF0 violet
const INK = [255, 255, 255];  // chevron

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function distSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const t = clamp((apx * abx + apy * aby) / (abx * abx + aby * aby || 1), 0, 1);
  const cx = ax + t * abx, cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

// rounded-box signed distance (<=0 inside)
function sdRoundRect(x, y, N, r) {
  const px = x - N / 2, py = y - N / 2, half = N / 2;
  const qx = Math.abs(px) - (half - r), qy = Math.abs(py) - (half - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function render(size) {
  const ss = 4, N = size * ss;
  const r = N * 0.225;
  // chevron geometry
  const apex = [N * 0.5, N * 0.37];
  const left = [N * 0.28, N * 0.60];
  const right = [N * 0.72, N * 0.60];
  const apex2 = [N * 0.5, N * 0.50];
  const left2 = [N * 0.28, N * 0.73];
  const right2 = [N * 0.72, N * 0.73];
  const stroke = N * 0.072;

  const out = Buffer.alloc(size * size * 4);
  for (let sy = 0; sy < size; sy++) {
    for (let sx = 0; sx < size; sx++) {
      let aR = 0, aG = 0, aB = 0, aA = 0;
      for (let j = 0; j < ss; j++) {
        for (let i = 0; i < ss; i++) {
          const x = sx * ss + i + 0.5, y = sy * ss + j + 0.5;
          const inside = sdRoundRect(x, y, N, r) <= 0;
          let r8 = 0, g8 = 0, b8 = 0, a8 = 0;
          if (inside) {
            const t = clamp(y / N, 0, 1);
            r8 = lerp(TOP[0], BOT[0], t); g8 = lerp(TOP[1], BOT[1], t); b8 = lerp(TOP[2], BOT[2], t);
            a8 = 255;
            const d = Math.min(
              distSeg(x, y, left[0], left[1], apex[0], apex[1]),
              distSeg(x, y, apex[0], apex[1], right[0], right[1]),
              distSeg(x, y, left2[0], left2[1], apex2[0], apex2[1]),
              distSeg(x, y, apex2[0], apex2[1], right2[0], right2[1]),
            );
            if (d <= stroke) { r8 = INK[0]; g8 = INK[1]; b8 = INK[2]; }
          }
          const af = a8 / 255;
          aR += r8 * af; aG += g8 * af; aB += b8 * af; aA += a8;
        }
      }
      const cnt = ss * ss;
      const A = aA / cnt;
      let R = 0, G = 0, B = 0;
      if (A > 0) { const k = (A / 255); R = (aR / cnt) / k; G = (aG / cnt) / k; B = (aB / cnt) / k; }
      const o = (sy * size + sx) * 4;
      out[o] = clamp(Math.round(R), 0, 255);
      out[o + 1] = clamp(Math.round(G), 0, 255);
      out[o + 2] = clamp(Math.round(B), 0, 255);
      out[o + 3] = clamp(Math.round(A), 0, 255);
    }
  }
  return out;
}

// ---- minimal PNG encoder (RGBA, no deps) ----
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [16, 32, 48, 128]) {
  const png = encodePNG(size, render(size));
  writeFileSync(resolve(OUT, `${size}.png`), png);
  console.log(`wrote public/icon/${size}.png (${png.length} bytes)`);
}
