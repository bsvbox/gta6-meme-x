// make-meme.mjs — draws the gta6-meme-x-01 meme, pixel by pixel, with Node's
// standard library only (no network, no fonts, no image files). Deterministic:
// same input always writes the same PNG bytes (fixed seed, no dates, no random).
// Run: node tools/make-meme.mjs  (writes meme.png next to the repo root)
//
// The meme: a fake GTA VI loading screen. Vice City sunset, skyline, palms,
// the make.fun ghost (white, thick black outline, sparkle eyes, holding a
// magenta coin with a white star) waiting at a loading bar stuck at 99%.
// Text in the picture: "LOADING GTA VI..." / "13 YEARS LATER" / "make.fun".

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 1200;
const H = 675;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'meme.png');

// ---------- canvas ----------
const img = new Uint8Array(W * H * 3);
function px(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = r; img[i + 1] = g; img[i + 2] = b;
}
function blendPx(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = Math.round(img[i] * (1 - a) + r * a);
  img[i + 1] = Math.round(img[i + 1] * (1 - a) + g * a);
  img[i + 2] = Math.round(img[i + 2] * (1 - a) + b * a);
}
function fillRect(x0, y0, x1, y1, c) {
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++)
    for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) px(x, y, c[0], c[1], c[2]);
}
function disc(cx, cy, r, c, alpha = 1) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    const dy = y - cy;
    const dx = Math.sqrt(Math.max(0, r * r - dy * dy));
    for (let x = Math.floor(cx - dx); x <= Math.ceil(cx + dx); x++) {
      if (alpha >= 1) px(x, y, c[0], c[1], c[2]);
      else blendPx(x, y, c[0], c[1], c[2], alpha);
    }
  }
}
function thickLine(x0, y0, x1, y1, w, c) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, c);
  }
}
// Even-odd scanline polygon fill. pts: [[x,y], ...]
function fillPoly(pts, c) {
  let minY = H, maxY = 0;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) px(x, y, c[0], c[1], c[2]);
    }
  }
}
function star5(cx, cy, rOuter, rInner, c) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  fillPoly(pts, c);
}
function sparkle(cx, cy, r, c) {
  // four-pointed star: 8 vertices, alternating outer/inner radius
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : r * 0.22;
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  fillPoly(pts, c);
}

// ---------- seeded random (deterministic) ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(1337);

// ---------- 5x7 bitmap font ----------
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  k: ['00000', '10000', '10010', '10100', '11000', '10100', '10010'],
  e: ['00000', '00000', '01110', '10001', '11111', '10000', '01110'],
  f: ['00110', '01000', '01000', '11110', '01000', '01000', '01000'],
  u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
  n: ['00000', '00000', '10110', '11001', '10001', '10001', '10001'],
};
function textWidth(str, scale) {
  return str.length * 6 * scale - scale;
}
function drawText(str, x, y, scale, color, outline) {
  const draw = (dx, dy, c) => {
    let cx = x + dx;
    for (const ch of str) {
      const g = FONT[ch] ?? FONT[' '];
      for (let r = 0; r < 7; r++)
        for (let col = 0; col < 5; col++)
          if (g[r][col] === '1') fillRect(cx + dx + col * scale, y + dy + r * scale, cx + dx + (col + 1) * scale, y + dy + (r + 1) * scale, c);
      cx += 6 * scale;
    }
  };
  if (outline) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]])
      draw(dx * scale, dy * scale, outline);
  }
  draw(0, 0, color);
}

// ---------- colours ----------
const WHITE = [255, 255, 255];
const BLACK = [10, 6, 18];
const MAGENTA = [255, 45, 135];
const SUN = [255, 233, 168];
const SKYLINE = [22, 10, 46];
const GROUND = [18, 7, 31];
const WINDOW_LIT = [255, 209, 102];

// ---------- sky: multi-stop vertical gradient ----------
const STOPS = [
  [0.0, [42, 10, 74]],
  [0.35, [123, 45, 139]],
  [0.6, [231, 84, 128]],
  [0.8, [255, 140, 66]],
  [1.0, [255, 209, 102]],
];
function lerp(a, b, t) {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}
for (let y = 0; y < 470; y++) {
  const t = y / 470;
  let c = STOPS[STOPS.length - 1][1];
  for (let s = 0; s < STOPS.length - 1; s++) {
    if (t >= STOPS[s][0] && t <= STOPS[s + 1][0]) {
      c = lerp(STOPS[s][1], STOPS[s + 1][1], (t - STOPS[s][0]) / (STOPS[s + 1][0] - STOPS[s][0]));
      break;
    }
  }
  for (let x = 0; x < W; x++) px(x, y, c[0], c[1], c[2]);
}

// stars in the upper sky
for (let i = 0; i < 60; i++) {
  const x = Math.floor(rnd() * W);
  const y = Math.floor(rnd() * 150);
  blendPx(x, y, 255, 255, 255, 0.5 + rnd() * 0.4);
}

// sun + glow
disc(890, 290, 150, [255, 190, 120], 0.25);
disc(890, 290, 105, SUN);

// ---------- skyline ----------
let bx = 0;
while (bx < W) {
  const bw = 46 + Math.floor(rnd() * 46);
  const bh = 60 + Math.floor(rnd() * 130);
  const top = 470 - bh;
  fillRect(bx, top, bx + bw, 470, SKYLINE);
  // lit windows
  for (let wy = top + 10; wy < 460; wy += 18) {
    for (let wx = bx + 8; wx < bx + bw - 8; wx += 16) {
      if (rnd() < 0.32) fillRect(wx, wy, wx + 6, wy + 8, WINDOW_LIT);
    }
  }
  bx += bw + Math.floor(rnd() * 14);
}

// ground
fillRect(0, 470, W, H, GROUND);

// ---------- palm trees ----------
function palm(baseX, lean) {
  const topX = baseX + lean * 40;
  const topY = 350;
  // trunk: curved, drawn as thick segments
  let prevX = baseX, prevY = 660;
  for (let s = 1; s <= 8; s++) {
    const t = s / 8;
    const x = baseX + (topX - baseX) * t * t;
    const y = 660 + (topY - 660) * t;
    thickLine(prevX, prevY, x, y, 18 - s, BLACK);
    prevX = x; prevY = y;
  }
  // fronds: arc up and out, then droop down
  for (let f = 0; f < 7; f++) {
    const spread = (f - 3) / 3; // -1..1
    const dir = lean > 0 ? 1 : -1;
    const midX = topX + spread * 70 * dir;
    const midY = topY - 34 - Math.abs(spread) * 6;
    const ex = topX + spread * 105 * dir;
    const ey = topY + 34 + Math.abs(spread) * 26;
    thickLine(topX, topY, midX, midY, 8, BLACK);
    thickLine(midX, midY, ex, ey, 6, BLACK);
  }
}
palm(95, 1);
palm(1105, -1);

// ---------- the make.fun ghost ----------
function ghost(cx, topY, bodyW, bodyH) {
  const half = bodyW / 2;
  const topCy = topY + half; // centre of the head arc
  const pts = [];
  // head arc, left to right over the top
  for (let a = Math.PI; a <= Math.PI * 2; a += 0.06) {
    pts.push([cx + Math.cos(a) * half, topCy + Math.sin(a) * half]);
  }
  // right side down
  pts.push([cx + half, topCy + bodyH - half]);
  // bottom waves: three bumps, left to right is already right side; go right->left
  const bumpR = bodyW / 6;
  const waveY = topCy + bodyH - half;
  for (let b = 2; b >= 0; b--) {
    const bcx = cx - half + bumpR + b * 2 * bumpR;
    for (let a = 0; a <= Math.PI; a += 0.12) {
      pts.push([bcx + Math.cos(a) * bumpR, waveY + Math.sin(a) * bumpR]);
    }
  }
  // left side up
  pts.push([cx - half, topCy]);
  // outline: same shape scaled 1.05 around the ghost centre
  const gc = [cx, topCy + bodyH / 2 - half / 2];
  const outline = pts.map(([x, y]) => [gc[0] + (x - gc[0]) * 1.055, gc[1] + (y - gc[1]) * 1.055]);
  fillPoly(outline, BLACK);
  fillPoly(pts, WHITE);
  // sparkle eyes
  sparkle(cx - 42, topCy - 6, 24, BLACK);
  sparkle(cx + 42, topCy - 6, 24, BLACK);
  // round little hand + magenta coin with white star
  disc(cx + half + 26, waveY - 58, 36, BLACK);
  disc(cx + half + 26, waveY - 58, 31, MAGENTA);
  star5(cx + half + 26, waveY - 58, 20, 8, WHITE);
  disc(cx + half - 2, waveY - 44, 17, BLACK);
  disc(cx + half - 2, waveY - 44, 13, WHITE);
}
ghost(600, 210, 230, 300);

// ---------- headline ----------
const line1 = 'LOADING GTA VI...';
const line2 = '13 YEARS LATER';
drawText(line1, Math.round((W - textWidth(line1, 5)) / 2), 44, 5, WHITE, BLACK);
drawText(line2, Math.round((W - textWidth(line2, 5)) / 2), 116, 5, [255, 209, 102], BLACK);

// ---------- loading bar ----------
fillRect(330, 596, 870, 624, BLACK);
fillRect(334, 600, 866, 620, [42, 10, 74]);
const fillW = Math.round((866 - 334) * 0.99);
fillRect(334, 600, 334 + fillW, 620, MAGENTA);
const pct = '99%';
drawText(pct, Math.round(600 - textWidth(pct, 3) / 2), 600, 3, WHITE, BLACK);

// ---------- make.fun wordmark, bottom-left ----------
drawText('make.fun', 28, 634, 4, WHITE, BLACK);

// ---------- PNG encode ----------
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0;
  raw.set(img.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(OUT, png);
console.log(`wrote ${OUT} (${png.length} bytes, ${W}x${H})`);
