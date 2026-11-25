import { Link } from "react-router-dom"
import { useMemo, useState } from "react"
import { Box, ChevronRight, MapPin, Plus } from "lucide-react"
import { RingkasanStok } from "../components/RingkasanStok"
import { SetupCard } from "../components/SetupCard"
import { Badge, Card, EmptyState, ErrorBox, kelasAreaMuat, LinkButton, Loading, PageHeader, SearchField } from "../components/ui"
import { bandingDus, cocokKata, formatAngka } from "../lib/format"
import { useDusList } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"

type Saring = "semua" | "berisi" | "kosong"

export function DusList() {
  const siap = supabaseConfigured()
  const query = useDusList()
  const [cari, setCari] = useState("")
  const [saring, setSaring] = useState<Saring>("semua")

  const daftar = useMemo(() => {
    return (query.data ?? [])
      .filter((item) => {
        if (saring === "berisi" && item.total_pcs === 0) return false
        if (saring === "kosong" && item.total_pcs > 0) return false
        return cocokKata(cari, [item.kode, item.lokasi, item.catatan])
      })
      .sort((a, b) => bandingDus(a, b))
  }, [query.data, cari, saring])

  return (
    <div className={siap && query.isLoading ? `relative ${kelasAreaMuat}` : undefined}>
      <PageHeader
        icon={Box}
        title="Dus"
        subtitle=""
        action={<LinkButton to="/dus/baru" className="px-3"><Plus size={18} /> Dus</LinkButton>}
      />
      {!siap ? (
        <SetupCard />
      ) : query.isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loading letak="baris" />
        </div>
      ) : query.error ? (
        <ErrorBox error={query.error} />
      ) : (
        <>
          <RingkasanStok />
          <SearchField value={cari} onChange={setCari} placeholder="Cari kode atau lokasi dus" />
          <div className="mt-3 flex gap-2">
            <Chip aktif={saring === "semua"} onClick={() => setSaring("semua")}>Semua</Chip>
            <Chip aktif={saring === "berisi"} onClick={() => setSaring("berisi")}>Berisi</Chip>
            <Chip aktif={saring === "kosong"} onClick={() => setSaring("kosong")}>Kosong</Chip>
          </div>
          {query.data?.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Belum ada dus" body="Tambah dus pertama, lalu isi dengan tas, botol minum, atau kotak makan." action={<LinkButton to="/dus/baru">Tambah dus</LinkButton>} />
            </div>
          ) : daftar.length === 0 ? (
            <p className="mt-6 text-sm text-mist-500">Tidak ada dus yang cocok.</p>
          ) : (
            <Card className="mt-4 divide-y divide-white/5">
              {daftar.map((item) => (
                <Link key={item.id} to={`/dus/${item.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{item.kode}</span>
                    <span className="mt-1 flex items-center gap-1 text-sm text-mist-500">
                      <MapPin size={14} className="shrink-0 text-amber-300" />
                      <span className="truncate">{item.lokasi || "Lokasi belum diisi"}</span>
                    </span>
                  </span>
                  <span className="text-right">
                    <Badge tone={item.jumlah_jenis > 0 ? "ok" : "neutral"}>{formatAngka(item.jumlah_jenis)} model & warna</Badge>
                    <span className="mt-1 block text-xs text-mist-500">{formatAngka(item.total_pcs)} pcs</span>
                  </span>
                  <ChevronRight size={18} className="text-mist-500" />
                </Link>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function Chip({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={aktif ? "rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-ink-950" : "rounded-full bg-white/5 px-3 py-1.5 text-sm text-mist-300"}
    >
      {children}
    </button>
  )
}
