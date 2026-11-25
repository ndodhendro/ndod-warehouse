import type { JenisBarang } from "../types"

export function normKode(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase()
}

export function normTeks(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function cocokKata(cari: string, bidang: Array<string | null | undefined>) {
  const bagian = cari.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (bagian.length === 0) return true
  const teks = bidang.filter((nilai): nilai is string => Boolean(nilai)).join(" ").toLowerCase()
  return bagian.every((kata) => teks.includes(kata))
}

export function kosongJadiNull(value: string) {
  const teks = normTeks(value)
  return teks.length ? teks : null
}

export function formatAngka(nilai: number) {
  return new Intl.NumberFormat("id-ID").format(nilai)
}

export function formatWaktu(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

const namaJenis: Record<JenisBarang, string> = {
  tas: "Tas",
  botol: "Botol minum",
  kotak: "Kotak makan",
}

export function labelJenis(jenis: JenisBarang) {
  return namaJenis[jenis]
}

export function labelBarang(barang: { jenis: JenisBarang; model: string; warna: string }) {
  return `${labelJenis(barang.jenis)} · ${barang.model} · ${barang.warna}`
}

export function bandingKode(a: string, b: string) {
  return a.localeCompare(b, "id", { numeric: true, sensitivity: "base" })
}

export function dusSample(dus: { kode: string }) {
  return dus.kode.trim().toUpperCase() === "S0"
}

export function bandingDus(a: { kode: string }, b: { kode: string }) {
  const prioritas = Number(dusSample(b)) - Number(dusSample(a))
  if (prioritas !== 0) return prioritas
  return bandingKode(a.kode, b.kode)
}

export function unduhCsv(nama: string, baris: string[][]) {
  const csv = baris
    .map((kolom) => kolom.map((sel) => `"${String(sel).replace(/"/g, '""')}"`).join(","))
    .join("\r\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const tautan = document.createElement("a")
  tautan.href = url
  tautan.download = nama
  tautan.click()
  URL.revokeObjectURL(url)
}
