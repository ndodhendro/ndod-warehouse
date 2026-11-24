import { useState } from "react"
import { Link } from "react-router-dom"
import { SetupCard } from "../components/SetupCard"
import { Card, EmptyState, ErrorBox, Loading, PageHeader } from "../components/ui"
import { formatAngka, formatWaktu, labelBarang } from "../lib/format"
import { useRiwayat } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"
import type { JenisRiwayat, RiwayatItem } from "../types"

const label: Record<JenisRiwayat, string> = {
  masuk: "Masuk",
  keluar: "Keluar",
  pindah: "Pindah",
  koreksi: "Koreksi",
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
    <div>
      <PageHeader title="Riwayat" subtitle="Jejak barang masuk, keluar, koreksi, dan pindah dus." />
      {!siap ? (
        <SetupCard />
      ) : query.isLoading ? (
        <Loading />
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
                className={saring === item.id ? "shrink-0 rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-ink-950" : "shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-sm text-mist-300"}
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
  const nama = item.barang ? labelBarang(item.barang) : item.barang_label || item.barang_kode || "Barang"
  const asal = item.asal?.kode ?? item.dus_asal_kode
  const tujuan = item.tujuan?.kode ?? item.dus_tujuan_kode
  const jumlah = item.jenis === "koreksi" ? `${item.jumlah > 0 ? "+" : ""}${formatAngka(item.jumlah)} pcs` : `${formatAngka(item.jumlah)} pcs`

  return (
    <Card className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">{label[item.jenis]}</p>
          <p className="mt-1 truncate font-semibold">{nama}</p>
          <p className="mt-1 text-sm text-mist-300">{kalimatLokasi(item.jenis, asal, tujuan)}</p>
          {item.keterangan && <p className="mt-1 text-sm text-mist-500">{item.keterangan}</p>}
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">{jumlah}</p>
          <p className="mt-1 text-xs text-mist-500">{formatWaktu(item.created_at)}</p>
        </div>
      </div>
      {(item.asal || item.tujuan || item.barang) && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-amber-300">
          {item.barang && <Link to={`/barang/${item.barang.id}`}>Lihat barang</Link>}
          {item.asal && <Link to={`/dus/${item.asal.id}`}>Dus {item.asal.kode}</Link>}
          {item.tujuan && item.tujuan.id !== item.asal?.id && <Link to={`/dus/${item.tujuan.id}`}>Dus {item.tujuan.kode}</Link>}
        </div>
      )}
    </Card>
  )
}

function kalimatLokasi(jenis: JenisRiwayat, asal: string | null, tujuan: string | null) {
  if (jenis === "pindah") return `${asal ?? "Dus asal"} → ${tujuan ?? "Dus tujuan"}`
  if (jenis === "masuk") return `Masuk ke ${tujuan ?? "dus"}`
  if (jenis === "keluar") return `Keluar dari ${asal ?? "dus"}`
  return `Di ${tujuan ?? asal ?? "dus"}`
}
