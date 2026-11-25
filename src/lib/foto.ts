import { db } from "./supabase"

const BUCKET = "ndod-warehouse"
const BATAS_PILIHAN = 20 * 1024 * 1024
const BATAS_UNGGAH = 4_500_000
const KADALUARSA_DETIK = 60 * 60 * 6

const polaPenuh = /^barang\/[0-9a-f-]{36}\/\d+-penuh\.jpg$/

export function pathKecil(penuh: string) {
  if (!penuh.endsWith("-penuh.jpg")) return penuh
  return `${penuh.slice(0, -"-penuh.jpg".length)}-kecil.jpg`
}

export async function tautanFoto(paths: string[]) {
  const unik = [...new Set(paths.filter(Boolean))]
  const peta = new Map<string, string>()
  for (let i = 0; i < unik.length; i += 80) {
    const bagian = unik.slice(i, i + 80)
    const { data, error } = await db().storage.from(BUCKET).createSignedUrls(bagian, KADALUARSA_DETIK)
    if (error) throw error
    for (const item of data ?? []) {
      if (!item.signedUrl || item.error || !item.path) continue
      peta.set(item.path, item.signedUrl)
    }
  }
  return peta
}

export async function unggahFoto(barangId: string, file: File) {
  if (file.size <= 0) throw new Error("Foto kosong.")
  if (file.size > BATAS_PILIHAN) throw new Error("Foto terlalu besar. Maksimal 20 MB.")
  const { penuh, kecil } = await siapkanFoto(file)
  const path = `barang/${barangId}/${Date.now()}-penuh.jpg`
  const opsi = { contentType: "image/jpeg", upsert: false, cacheControl: "86400" }
  const unggahPenuh = await db().storage.from(BUCKET).upload(path, penuh, opsi)
  if (unggahPenuh.error) throw unggahPenuh.error
  const unggahKecil = await db().storage.from(BUCKET).upload(pathKecil(path), kecil, opsi)
  if (unggahKecil.error) {
    await db().storage.from(BUCKET).remove([path])
    throw unggahKecil.error
  }
  return path
}

export async function hapusBerkasFoto(path: string) {
  if (!polaPenuh.test(path)) return
  const { error } = await db().storage.from(BUCKET).remove([path, pathKecil(path)])
  if (error) throw error
}

async function siapkanFoto(file: File) {
  const sumber = await muatBitmap(file)
  try {
    const penuh = await jpegDalamBatas(sumber, 4096, 0.9)
    const kecil = await gambarKeJpeg(sumber, 192, 0.72)
    return { penuh, kecil }
  } finally {
    sumber.close()
  }
}

async function jpegDalamBatas(sumber: ImageBitmap, maxSisi: number, kualitasAwal: number) {
  let sisi = maxSisi
  let kualitas = kualitasAwal
  let blob = await gambarKeJpeg(sumber, sisi, kualitas)
  while (blob.size > BATAS_UNGGAH && (kualitas > 0.6 || sisi > 1600)) {
    if (kualitas > 0.6) kualitas = Math.round((kualitas - 0.1) * 100) / 100
    else sisi = Math.round(sisi * 0.8)
    blob = await gambarKeJpeg(sumber, sisi, kualitas)
  }
  return blob
}

function gambarKeJpeg(sumber: ImageBitmap, maxSisi: number, kualitas: number) {
  const terpanjang = Math.max(sumber.width, sumber.height)
  if (terpanjang < 1) throw new Error("Foto tidak bisa dibaca.")
  const skala = terpanjang > maxSisi ? maxSisi / terpanjang : 1
  const lebar = Math.max(1, Math.round(sumber.width * skala))
  const tinggi = Math.max(1, Math.round(sumber.height * skala))
  const kanvas = document.createElement("canvas")
  kanvas.width = lebar
  kanvas.height = tinggi
  const ctx = kanvas.getContext("2d")
  if (!ctx) throw new Error("Foto tidak bisa diproses di perangkat ini.")
  ctx.drawImage(sumber, 0, 0, lebar, tinggi)
  return new Promise<Blob>((resolve, reject) => {
    kanvas.toBlob((blob) => {
      if (!blob) reject(new Error("Foto tidak bisa diproses di perangkat ini."))
      else resolve(blob)
    }, "image/jpeg", kualitas)
  })
}

async function muatBitmap(file: File) {
  const tipe = file.type.toLowerCase()
  const nama = file.name.toLowerCase()
  const didukung = /^image\/(jpeg|png|webp|heic|heif)$/.test(tipe) || /\.(jpe?g|png|webp|heic|heif)$/.test(nama) || tipe.startsWith("image/")
  if (!didukung) throw new Error("Gunakan foto JPG, PNG, atau WEBP.")
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error("Format foto ini tidak didukung di perangkat ini. Gunakan JPG, PNG, atau WEBP."))
        el.src = url
      })
      return await createImageBitmap(img)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}
