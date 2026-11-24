import { deflateSync } from "node:zlib"
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public")

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type)
  const body = Buffer.concat([t, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, pixels) {
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

function draw(size, maskable) {
  const px = Buffer.alloc(size * size * 4, 0)
  const bg = maskable ? [20, 26, 24, 255] : [16, 20, 18, 255]
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = bg[0]
    px[i * 4 + 1] = bg[1]
    px[i * 4 + 2] = bg[2]
    px[i * 4 + 3] = bg[3]
  }

  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size || a <= 0) return
    const i = (y * size + x) * 4
    const aa = a / 255
    const ba = px[i + 3] / 255
    const out = aa + ba * (1 - aa)
    if (out <= 0) return
    px[i] = Math.round((r * aa + px[i] * ba * (1 - aa)) / out)
    px[i + 1] = Math.round((g * aa + px[i + 1] * ba * (1 - aa)) / out)
    px[i + 2] = Math.round((b * aa + px[i + 2] * ba * (1 - aa)) / out)
    px[i + 3] = Math.round(out * 255)
  }

  const fillRound = (x, y, w, h, rad, color) => {
    const r = Math.min(rad, w / 2, h / 2)
    const [R, G, B, A] = color
    const x0 = Math.max(0, Math.floor(x))
    const y0 = Math.max(0, Math.floor(y))
    const x1 = Math.min(size, Math.ceil(x + w))
    const y1 = Math.min(size, Math.ceil(y + h))
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const cx = Math.min(Math.max(xx + 0.5, x + r), x + w - r)
        const cy = Math.min(Math.max(yy + 0.5, y + r), y + h - r)
        const dx = xx + 0.5 - cx
        const dy = yy + 0.5 - cy
        if (dx * dx + dy * dy <= r * r) set(xx, yy, R, G, B, A)
      }
    }
  }

  const scale = maskable ? 0.62 : 0.78
  const side = size * scale
  const ox = (size - side) / 2
  const oy = (size - side) / 2
  const u = (n) => ox + side * n

  fillRound(u(0.08), u(0.08), side * 0.84, side * 0.84, side * 0.16, [28, 36, 33, 255])
  fillRound(u(0.22), u(0.4), side * 0.56, side * 0.36, side * 0.045, [196, 132, 42, 255])
  fillRound(u(0.18), u(0.28), side * 0.64, side * 0.2, side * 0.05, [243, 199, 122, 255])
  fillRound(u(0.455), u(0.28), side * 0.09, side * 0.48, side * 0.02, [184, 112, 32, 255])
  fillRound(u(0.3), u(0.46), side * 0.4, side * 0.025, side * 0.01, [16, 20, 18, 180])

  return px
}

const files = [
  ["pwa-192.png", 192, false],
  ["pwa-512.png", 512, false],
  ["pwa-512-maskable.png", 512, true],
  ["apple-touch-icon.png", 180, false],
]

for (const [name, size, maskable] of files) {
  writeFileSync(join(root, name), encodePng(size, draw(size, maskable)))
  console.log(name)
}
