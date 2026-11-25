import { useState } from "react"
import { ScrollText } from "lucide-react"
import { Link } from "react-router-dom"
import { LabelWarna } from "../components/LabelWarna"
import { SetupCard } from "../components/SetupCard"
import { Badge, Card, EmptyState, ErrorBox, kelasAreaMuat, Loading, PageHeader } from "../components/ui"
import { formatAngka, formatWaktu, labelJenis } from "../lib/format"
import { warnaTeks } from "../lib/warna"
import { useRiwayat } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"
import type { JenisBarang, JenisRiwayat, RiwayatItem } from "../types"

const label: Record<JenisRiwayat, string> = {
  masuk: "Masuk",
  keluar: "Keluar",
  pindah: "Pindah",
  koreksi: "Koreksi",
}

const warna: Record<JenisRiwayat, string> = {
  masuk: "text-teal-300",
  keluar: "text-amber-300",
  pindah: "text-lilac-300",
  koreksi: "text-blue-300",
}

function kelasSaring(id: "semua" | JenisRiwayat, aktif: boolean) {
  const dasar = "shrink-0 rounded-full px-3 py-1.5 text-sm"
  if (id === "semua") {
    return aktif ? `${dasar} bg-amber-500 font-semibold text-ink-950` : `${dasar} bg-white/5 text-mist-300`
  }
  return aktif ? `${dasar} bg-white/10 font-semibold ${warna[id]}` : `${dasar} bg-white/5 ${warna[id]}`
}

const saringan: Array<{ id: "semua" | JenisRiwayat; label: string }> = [
  { id: "semua", label: "Semua" },
  { id: "pindah", label: "Pindah" },
  { id: "masuk", label: "Masuk" },
  { id: "keluar", label: "Keluar" },
  { id: "koreksi", label: "Koreksi" },
]

export function RiwayatPage() {
  const siap = supabaseConfigured()
  const query = useRiwayat()
  const [saring, setSaring] = useState<(typeof saringan)[number]["id"]>("semua")
  const daftar = (query.data ?? []).filter((item) => saring === "semua" || item.jenis === saring)

  return (
    <div className={siap && query.isLoading ? `relative ${kelasAreaMuat}` : undefined}>
      <PageHeader icon={ScrollText} title="Riwayat" subtitle="" />
      {!siap ? (
        <SetupCard />
      ) : query.isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loading letak="baris" />
        </div>
      ) : query.error ? (
        <ErrorBox error={query.error} />
      ) : query.data?.length === 0 ? (
        <EmptyState title="Belum ada riwayat" body="Setiap perubahan stok di dus tercatat di sini." />
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-auto">
            {saringan.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSaring(item.id)}
                className={kelasSaring(item.id, saring === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {daftar.length === 0 ? (
            <p className="text-sm text-mist-500">Tidak ada riwayat untuk saringan ini.</p>
          ) : (
            <div className="space-y-2">
              {daftar.map((item) => (
                <KartuRiwayat key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function KartuRiwayat({ item }: { item: RiwayatItem }) {
  const asal = item.asal?.kode ?? item.dus_asal_kode
  const tujuan = item.tujuan?.kode ?? item.dus_tujuan_kode
  const jumlah = item.jenis === "koreksi" ? `${item.jumlah > 0 ? "+" : ""}${formatAngka(item.jumlah)} pcs` : `${formatAngka(item.jumlah)} pcs`

  return (
    <Card className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${warna[item.jenis]}`}>{label[item.jenis]}</p>
          <p className="mt-1 truncate font-semibold">
            <NamaRiwayat item={item} />
          </p>
          <p className="mt-1 text-sm text-mist-300">{kalimatLokasi(item.jenis, asal, tujuan)}</p>
          {item.keterangan && <p className="mt-1 text-sm text-mist-500">{item.keterangan}</p>}
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">{jumlah}</p>
          <p className="mt-1 text-xs text-mist-500">{formatWaktu(item.created_at)}</p>
          <p className="mt-0.5 max-w-[9rem] truncate text-xs text-mist-500" title={item.pengguna_email ?? undefined}>
            {item.pengguna_nama || item.pengguna_email || "Sebelum login"}
          </p>
        </div>
      </div>
      {(item.asal || item.tujuan || item.barang) && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-amber-300">
          {item.barang && <Link to={`/barang/${item.barang.id}`}>Lihat barang</Link>}
          {item.asal && (
            <Link to={`/dus/${item.asal.id}`}>{item.tujuan && item.tujuan.id !== item.asal.id ? "Lihat dus asal" : "Lihat dus"}</Link>
          )}
          {item.tujuan && item.tujuan.id !== item.asal?.id && (
            <Link to={`/dus/${item.tujuan.id}`}>{item.asal ? "Lihat dus tujuan" : "Lihat dus"}</Link>
          )}
        </div>
      )}
    </Card>
  )
}

const awalanJenis: Array<{ label: string; jenis: JenisBarang }> = [
  { label: "Kotak makan", jenis: "kotak" },
  { label: "Botol minum", jenis: "botol" },
  { label: "Tas", jenis: "tas" },
]

function NamaRiwayat({ item }: { item: RiwayatItem }) {
  if (item.barang) {
    return (
      <>
        <Badge tone={item.barang.jenis}>{labelJenis(item.barang.jenis)}</Badge>
        {" · "}
        {item.barang.model}
        {" · "}
        <LabelWarna nama={item.barang.warna} />
      </>
    )
  }
  const teks = item.barang_label || item.barang_kode || "Barang"
  const cocok = awalanJenis.find((awal) => teks.startsWith(`${awal.label} · `))
  const sisa = cocok ? teks.slice(cocok.label.length + 3) : teks
  const potong = sisa.lastIndexOf(" · ")
  const nama = potong === -1 ? "" : sisa.slice(potong + 3)
  const punyaWarna = Boolean(nama && warnaTeks(nama))
  return (
    <>
      {cocok && (
        <>
          <Badge tone={cocok.jenis}>{labelJenis(cocok.jenis)}</Badge>
          {" · "}
        </>
      )}
      {punyaWarna ? (
        <>
          {sisa.slice(0, potong + 3)}
          <LabelWarna nama={nama} />
        </>
      ) : (
        sisa
      )}
    </>
  )
}

function kalimatLokasi(jenis: JenisRiwayat, asal: string | null, tujuan: string | null) {
  if (jenis === "pindah") return `${asal ?? "Dus asal"} → ${tujuan ?? "Dus tujuan"}`
  if (jenis === "masuk") return `Masuk ke ${tujuan ?? "dus"}`
  if (jenis === "keluar") return `Keluar dari ${asal ?? "dus"}`
  return `Di ${tujuan ?? asal ?? "dus"}`
}
