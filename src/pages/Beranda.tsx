import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { useMemo, useState } from "react"
import { ChevronRight, MapPin } from "lucide-react"
import { InstallHint } from "../components/InstallHint"
import { SetupCard } from "../components/SetupCard"
import { Badge, Card, EmptyState, ErrorBox, LinkButton, Loading, PageHeader, SearchField, Stat } from "../components/ui"
import { formatAngka, labelBarang, labelJenis } from "../lib/format"
import { useBarangList, useDusList, useRiwayat } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"
import { KartuRiwayat } from "./Riwayat"

export function Beranda() {
  const siap = supabaseConfigured()
  const dus = useDusList()
  const barang = useBarangList()
  const riwayat = useRiwayat()
  const [cari, setCari] = useState("")
  const kata = cari.trim().toLowerCase()

  const ringkas = useMemo(() => {
    const daftarDus = dus.data ?? []
    const daftarBarang = barang.data ?? []
    return {
      dus: daftarDus.length,
      kosong: daftarDus.filter((item) => item.total_pcs === 0).length,
      barang: daftarBarang.length,
      pcs: daftarBarang.reduce((total, item) => total + item.total_pcs, 0),
    }
  }, [dus.data, barang.data])

  const dusCocok = (dus.data ?? []).filter((item) =>
    !kata ? false : [item.kode, item.nama, item.lokasi].some((nilai) => nilai?.toLowerCase().includes(kata)),
  )
  const barangCocok = (barang.data ?? []).filter((item) =>
    !kata
      ? false
      : [item.kode, item.model, item.warna, labelJenis(item.jenis)].some((nilai) => nilai.toLowerCase().includes(kata)),
  )

  return (
    <div>
      <PageHeader kicker="Ndod" title="Gudang" subtitle="Cek stok dan di dus mana barang disimpan." />
      <InstallHint />
      {!siap ? (
        <SetupCard />
      ) : dus.isLoading || barang.isLoading ? (
        <Loading />
      ) : dus.error || barang.error ? (
        <ErrorBox error={dus.error ?? barang.error} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Dus" value={formatAngka(ringkas.dus)} hint={ringkas.kosong ? `${formatAngka(ringkas.kosong)} kosong` : "semua berisi"} />
            <Stat label="Barang" value={formatAngka(ringkas.barang)} hint="model & warna" />
            <Stat label="Total" value={formatAngka(ringkas.pcs)} hint="pcs" />
          </div>

          <div className="mt-5">
            <SearchField value={cari} onChange={setCari} placeholder="Cari kode, model, warna, atau lokasi" />
          </div>

          {kata ? (
            <div className="mt-4 space-y-4">
              <Bagian judul="Dus" kosong={dusCocok.length === 0}>
                {dusCocok.map((item) => (
                  <Link key={item.id} to={`/dus/${item.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span>
                      <span className="block font-semibold">{item.nama || item.kode}</span>
                      <span className="block text-sm text-mist-500">
                        {item.kode}
                        {item.lokasi ? ` · ${item.lokasi}` : ""} · {formatAngka(item.total_pcs)} pcs
                      </span>
                    </span>
                    <ChevronRight size={18} className="text-mist-500" />
                  </Link>
                ))}
              </Bagian>
              <Bagian judul="Barang" kosong={barangCocok.length === 0}>
                {barangCocok.map((item) => (
                  <Link key={item.id} to={`/barang/${item.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span>
                      <span className="block font-semibold">{item.model}</span>
                      <span className="block text-sm text-mist-500">
                        {labelBarang(item)} · {formatAngka(item.total_pcs)} pcs
                      </span>
                    </span>
                    <ChevronRight size={18} className="text-mist-500" />
                  </Link>
                ))}
              </Bagian>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <LinkButton to="/dus/baru" variant="ghost">Tambah dus</LinkButton>
                <LinkButton to="/barang/baru" variant="ghost">Tambah barang</LinkButton>
              </div>
              <section className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold">Riwayat terbaru</h2>
                  <Link to="/riwayat" className="text-sm text-amber-300">Lihat semua</Link>
                </div>
                {riwayat.isLoading ? (
                  <Loading />
                ) : riwayat.error ? (
                  <ErrorBox error={riwayat.error} />
                ) : (riwayat.data ?? []).length === 0 ? (
                  <EmptyState title="Belum ada pergerakan" body="Tambah barang ke dalam dus, atau pindahkan stok. Riwayatnya muncul di sini." />
                ) : (
                  <div className="space-y-2">
                    {riwayat.data!.slice(0, 5).map((item) => (
                      <KartuRiwayat key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </section>
              {(dus.data ?? []).length > 0 && (
                <section className="mt-6">
                  <h2 className="mb-2 font-semibold">Dus</h2>
                  <Card className="divide-y divide-white/5">
                    {dus.data!.slice(0, 6).map((item) => (
                      <Link key={item.id} to={`/dus/${item.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{item.nama || item.kode}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-sm text-mist-500">
                            <MapPin size={14} />
                            {item.lokasi || "Lokasi belum diisi"}
                          </span>
                        </span>
                        <Badge tone={item.total_pcs > 0 ? "ok" : "neutral"}>{formatAngka(item.total_pcs)} pcs</Badge>
                      </Link>
                    ))}
                  </Card>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function Bagian({ judul, kosong, children }: { judul: string; kosong: boolean; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-semibold">{judul}</h2>
      {kosong ? (
        <p className="text-sm text-mist-500">Tidak ada yang cocok.</p>
      ) : (
        <Card className="divide-y divide-white/5">{children}</Card>
      )}
    </section>
  )
}
