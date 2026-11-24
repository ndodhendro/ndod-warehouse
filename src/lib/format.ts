import type { JenisBarang } from "../types"

export function normKode(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase()
}

export function normTeks(value: string) {
  return value.trim().replace(/\s+/g, " ")
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
