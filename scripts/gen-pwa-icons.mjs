// Generates pwa-192x192.png and pwa-512x512.png using only Node built-ins.
// Solid amber (#D97706 = 217,119,6) background matching the PWA theme_color.
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'

const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[i] = c
}
function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = (crc >>> 8) ^ crcTable[(crc ^ b) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(size, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2  // 8-bit RGB

  // one filter byte (0) per row + 3 bytes per pixel
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3)
    raw[row] = 0  // filter: None
    for (let x = 0; x < size; x++) {
      raw[row + 1 + x * 3] = r
      raw[row + 2 + x * 3] = g
      raw[row + 3 + x * 3] = b
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('apps/web/public', { recursive: true })
const amber = [217, 119, 6]
writeFileSync('apps/web/public/pwa-192x192.png', makePNG(192, amber))
writeFileSync('apps/web/public/pwa-512x512.png', makePNG(512, amber))
console.log('Generated pwa-192x192.png and pwa-512x512.png')
