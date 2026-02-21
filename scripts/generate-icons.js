#!/usr/bin/env node

/**
 * Generate PNG icons for the Clawkins Homebase PWA.
 *
 * This script creates minimal valid PNG files with a violet (#7c3aed) background
 * and a white cat-paw silhouette. It uses only Node.js built-in modules (no deps).
 *
 * The PNGs are created by building raw RGBA pixel data, compressing with zlib,
 * and writing a valid PNG file structure.
 *
 * Usage:  node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');

// Ensure output directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// ---- Color helpers ----

const VIOLET = [0x7c, 0x3a, 0xed, 0xff]; // #7c3aed
const WHITE  = [0xf5, 0xf3, 0xff, 0xff]; // #f5f3ff (slightly off-white, matching the SVG)

// ---- Geometry helpers ----

/** Check if (x, y) is inside an axis-aligned ellipse centred at (cx, cy) with radii rx, ry. */
function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Return true if the pixel at (x, y) in a `size x size` canvas should be white (paw). */
function isPaw(x, y, size) {
  // Normalise coordinates to a 512-unit space so proportions match the SVG.
  const s = size / 512;

  // Main pad
  if (inEllipse(x, y, 256 * s, 320 * s, 80 * s, 65 * s)) return true;
  // Toe pads (ignoring slight rotation for simplicity)
  if (inEllipse(x, y, 170 * s, 220 * s, 35 * s, 40 * s)) return true;
  if (inEllipse(x, y, 230 * s, 195 * s, 32 * s, 38 * s)) return true;
  if (inEllipse(x, y, 282 * s, 195 * s, 32 * s, 38 * s)) return true;
  if (inEllipse(x, y, 342 * s, 220 * s, 35 * s, 40 * s)) return true;

  return false;
}

// ---- PNG encoder (minimal, valid) ----

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);

  const crcData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData));

  return Buffer.concat([len, typeBuf, data, crc]);
}

function generatePNG(size) {
  // Build raw pixel rows (filter byte 0 = None, then RGBA for each pixel)
  const rowBytes = 1 + size * 4;
  const raw = Buffer.alloc(rowBytes * size);

  for (let row = 0; row < size; row++) {
    const offset = row * rowBytes;
    raw[offset] = 0; // filter: None
    for (let col = 0; col < size; col++) {
      const px = isPaw(col, row, size) ? WHITE : VIOLET;
      const i = offset + 1 + col * 4;
      raw[i]     = px[0];
      raw[i + 1] = px[1];
      raw[i + 2] = px[2];
      raw[i + 3] = px[3];
    }
  }

  const compressed = zlib.deflateSync(raw);

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);   // width
  ihdr.writeUInt32BE(size, 4);   // height
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 6;  // color type: RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', iend),
  ]);
}

// ---- Generate icons ----

const sizes = [192, 512];

for (const size of sizes) {
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(ICONS_DIR, filename);
  console.log(`Generating ${filename} ...`);
  const png = generatePNG(size);
  fs.writeFileSync(filepath, png);
  console.log(`  -> ${filepath} (${png.length} bytes)`);
}

// Also create apple-touch-icon (180x180 is standard for Apple)
const appleSize = 180;
const appleFilename = 'apple-touch-icon.png';
const applePath = path.join(ICONS_DIR, appleFilename);
console.log(`Generating ${appleFilename} ...`);
const applePng = generatePNG(appleSize);
fs.writeFileSync(applePath, applePng);
console.log(`  -> ${applePath} (${applePng.length} bytes)`);

console.log('\nDone! All icons generated.');
