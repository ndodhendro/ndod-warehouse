import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MapPin, Minus, Pencil, Plus } from "lucide-react"
import { LabelWarna } from "../components/LabelWarna"
import { SetupCard } from "../components/SetupCard"
import { Badge, Button, Card, EmptyState, ErrorBox, Field, FormActions, LinkButton, Loading, PageHeader, SearchField, Sheet, useConfirm, useToast } from "../components/ui"
import { setJumlahIsi, tambahIsi } from "../lib/api"
import { pesanError } from "../lib/errors"
import { formatAngka, labelBarang, labelJenis } from "../lib/format"
import { useBarangList, useDus, useIsiDus } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"
import type { JenisBarang } from "../types"

type Saring = "semua" | JenisBarang

export function DusDetail() {
  const { id = "" } = useParams()
  const dus = useDus(id)
  const isi = useIsiDus(id)
  const barang = useBarangList()
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Record<string, number> | null>(null)
  const [tambah, setTambah] = useState(false)
  const [cari, setCari] = useState("")
  const [saring, setSaring] = useState<Saring>("semua")

  const baris = isi.data ?? []
  const kata = cari.trim().toLowerCase()
  const tampilan = useMemo(() => {
    return baris.filter((row) => {
      if (saring !== "semua" && row.barang.jenis !== saring) return false
      if (!kata) return true
      return [row.barang.kode, row.barang.model, row.barang.warna, labelJenis(row.barang.jenis)].some((nilai) => nilai.toLowerCase().includes(kata))
    })
  }, [baris, kata, saring])
  const kotor = useMemo(() => {
    if (!draft || !isi.data) return false
    return isi.data.some((row) => draft[row.barang_id] !== row.jumlah)
  }, [draft, isi.data])

  useEffect(() => {
    if (!isi.data) return
    const server = Object.fromEntries(isi.data.map((row) => [row.barang_id, row.jumlah]))
    setDraft((prev) => {
      if (!prev) return server
      const berubah = isi.data!.some((row) => prev[row.barang_id] !== row.jumlah)
      return berubah ? prev : server
    })
  }, [isi.data])

  const simpan = useMutation({
    mutationFn: async () => {
      const perubahan = baris.filter((row) => (draft?.[row.barang_id] ?? row.jumlah) !== row.jumlah)
      for (const row of perubahan) {
        await setJumlahIsi(id, row.barang_id, draft?.[row.barang_id] ?? 0, "Koreksi jumlah di dus")
      }
    },
    onSuccess: async () => {
      toast("Jumlah di dus disimpan.")
      await qc.invalidateQueries()
    },
    onError: (error) => toast(pesanError(error), "err"),
  })

  if (!supabaseConfigured()) {
    return (
      <div>
        <PageHeader title="Dus" back="/dus" />
        <SetupCard />
      </div>
    )
  }
  if (dus.isLoading || isi.isLoading) return <Loading />
  if (dus.error || isi.error) return <ErrorBox error={dus.error ?? isi.error} />
  if (!dus.data) return <PageHeader title="Dus tidak ditemukan" back="/dus" />

  const data = dus.data

  return (
    <div>
      <PageHeader
        kicker={data.kode}
        title={data.nama || data.kode}
        subtitle={`${formatAngka(data.total_pcs)} pcs · ${formatAngka(data.jumlah_jenis)} model`}
        back="/dus"
        action={
          <Link to={`/dus/${data.id}/edit`} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10" aria-label="Ubah dus">
            <Pencil size={18} />
          </Link>
        }
      />
      <Card className="mb-4 px-4 py-3 text-sm text-mist-300">
        <p className="flex items-center gap-2">
          <MapPin size={16} className="text-amber-300" />
          {data.lokasi || "Lokasi belum diisi"}
        </p>
        {data.catatan && <p className="mt-2 text-mist-500">{data.catatan}</p>}
      </Card>

      <div className="mb-4 flex gap-2">
        <Button variant="ghost" className="flex-1 !text-amber-300" onClick={() => setTambah(true)}><Plus size={18} /> Barang</Button>
        <LinkButton to={`/dus/${data.id}/pindah`} variant="ghost" className="flex-1 !text-amber-300">Pindahkan</LinkButton>
      </div>

      {baris.length === 0 ? (
        <EmptyState title="Dus ini kosong" body="Masukkan tas, botol minum, atau kotak makan yang disimpan di dus ini." action={<Button onClick={() => setTambah(true)}>Tambah barang</Button>} />
      ) : (
        <>
          <SearchField value={cari} onChange={setCari} placeholder="Cari kode, model, atau warna barang" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip aktif={saring === "semua"} onClick={() => setSaring("semua")}>Semua</Chip>
            <Chip aktif={saring === "tas"} onClick={() => setSaring("tas")}>Tas</Chip>
            <Chip aktif={saring === "botol"} onClick={() => setSaring("botol")}>Botol minum</Chip>
            <Chip aktif={saring === "kotak"} onClick={() => setSaring("kotak")}>Kotak makan</Chip>
          </div>
          {tampilan.length === 0 ? (
            <p className="mt-6 text-sm text-mist-500">Tidak ada barang yang cocok.</p>
          ) : (
            <Card className="mt-4 divide-y divide-white/5">
              {tampilan.map((row) => {
                const jumlah = draft?.[row.barang_id] ?? row.jumlah
                return (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                    <Link to={`/barang/${row.barang_id}`} className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <Badge tone={row.barang.jenis}>{labelJenis(row.barang.jenis)}</Badge>
                        <span className="truncate text-xs text-mist-500">{row.barang.kode}</span>
                      </span>
                      <span className="mt-1 block truncate font-semibold">{row.barang.model}</span>
                      <LabelWarna nama={row.barang.warna} className="block text-sm text-mist-500" />
                      {jumlah === 0 && <span className="mt-1 block text-xs text-clay-400">Akan dikeluarkan saat disimpan</span>}
                    </Link>
                    <div className="flex items-center gap-1">
                      <button type="button" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10" aria-label={`Kurangi ${row.barang.model}`} onClick={() => setDraft((now) => ({ ...(now ?? {}), [row.barang_id]: Math.max(0, jumlah - 1) }))}>
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center font-semibold tabular-nums">{formatAngka(jumlah)}</span>
                      <button type="button" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10" aria-label={`Tambah ${row.barang.model}`} onClick={() => setDraft((now) => ({ ...(now ?? {}), [row.barang_id]: Math.min(1000000, jumlah + 1) }))}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </Card>
          )}
        </>
      )}

      {kotor && (
        <div className="sticky bottom-3 z-20 -mx-4 mt-4 bg-ink-950 px-4 py-3 md:bottom-4 md:mx-0 md:px-0">
          <FormActions
            cancelClassName="!bg-ink-800 hover:!bg-ink-700"
            pending={simpan.isPending}
            submitType="button"
            onCancel={() => setDraft(Object.fromEntries(baris.map((row) => [row.barang_id, row.jumlah])))}
            onSubmit={async () => {
              const adaYangKeluar = baris.some((row) => (draft?.[row.barang_id] ?? row.jumlah) === 0 && row.jumlah !== 0)
              if (adaYangKeluar) {
                const ya = await confirm({
                  title: "Keluarkan barang dari dus?",
                  body: "Jumlah 0 berarti barang itu tidak lagi disimpan di dus ini.",
                  confirmLabel: "Simpan",
                  danger: true,
                })
                if (!ya) return
              }
              simpan.mutate()
            }}
            submitLabel="Simpan"
          />
        </div>
      )}

      {tambah && (
        <TambahKeDus
          dusId={id}
          sudahAda={new Map(baris.map((row) => [row.barang_id, row.jumlah]))}
          katalog={barang.data ?? []}
          memuat={barang.isLoading}
          onClose={() => setTambah(false)}
          onSelesai={async (pesan) => {
            setTambah(false)
            toast(pesan)
            await qc.invalidateQueries()
          }}
        />
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

function TambahKeDus({
  dusId,
  sudahAda,
  katalog,
  memuat,
  onClose,
  onSelesai,
}: {
  dusId: string
  sudahAda: Map<string, number>
  katalog: Array<{ id: string; kode: string; jenis: "tas" | "botol" | "kotak"; model: string; warna: string }>
  memuat: boolean
  onClose: () => void
  onSelesai: (pesan: string) => Promise<void>
}) {
  const [cari, setCari] = useState("")
  const [dipilih, setDipilih] = useState<string | null>(null)
  const [jumlah, setJumlah] = useState("1")
  const [catatan, setCatatan] = useState("")
  const [galat, setGalat] = useState<string | null>(null)
  const kata = cari.trim().toLowerCase()
  const daftar = katalog.filter((item) =>
    !kata ? true : [item.kode, item.model, item.warna, labelJenis(item.jenis)].some((nilai) => nilai.toLowerCase().includes(kata)),
  )
  const barang = katalog.find((item) => item.id === dipilih)
  const ada = dipilih ? sudahAda.get(dipilih) : undefined

  const simpan = useMutation({
    mutationFn: () => tambahIsi(dusId, dipilih!, Number(jumlah), catatan),
    onSuccess: () => onSelesai(barang ? `${labelBarang(barang)} ditambahkan.` : "Barang ditambahkan."),
    onError: (error) => setGalat(pesanError(error)),
  })

  return (
    <Sheet title="Tambah ke dus" onClose={onClose}>
      {katalog.length === 0 && !memuat ? (
        <EmptyState title="Belum ada barang" body="Buat dulu varian tas, botol minum, atau kotak makan, lalu masukkan ke dus." action={<LinkButton to="/barang/baru">Tambah barang</LinkButton>} />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const nilai = Number(jumlah)
            if (!dipilih) {
              setGalat("Pilih barang.")
              return
            }
            if (!Number.isInteger(nilai) || nilai < 1) {
              setGalat("Jumlah harus bilangan lebih dari 0.")
              return
            }
            setGalat(null)
            simpan.mutate()
          }}
        >
          <SearchField value={cari} onChange={setCari} placeholder="Cari kode, model, atau warna barang" />
          <div className="max-h-56 space-y-1 overflow-auto">
            {memuat && <Loading />}
            {daftar.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDipilih(item.id)}
                className={dipilih === item.id ? "block w-full rounded-xl bg-amber-500/15 px-3 py-2 text-left" : "block w-full rounded-xl px-3 py-2 text-left hover:bg-white/5"}
              >
                <span className="block font-medium">{item.model} · <LabelWarna nama={item.warna} /></span>
                <span className="block text-xs text-mist-500">{labelJenis(item.jenis)} · {item.kode}</span>
              </button>
            ))}
          </div>
          {ada !== undefined && <p className="text-sm text-mist-300">Sudah ada {formatAngka(ada)} pcs di dus ini. Jumlah di bawah akan ditambahkan.</p>}
          <Field label="Jumlah yang ditambahkan">
            <input className="field" inputMode="numeric" value={jumlah} onChange={(event) => setJumlah(event.target.value)} />
          </Field>
          <Field label="Catatan" hint="Opsional. Muncul di riwayat.">
            <input className="field" placeholder="Opsional" value={catatan} maxLength={200} onChange={(event) => setCatatan(event.target.value)} />
          </Field>
          {galat && <p className="text-sm text-clay-400">{galat}</p>}
          <FormActions onCancel={onClose} pending={simpan.isPending} submitLabel="Masukkan ke dus" />
        </form>
      )}
    </Sheet>
  )
}
