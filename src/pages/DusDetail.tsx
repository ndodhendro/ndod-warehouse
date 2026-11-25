import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronDown, MapPin, Pencil, Plus, X } from "lucide-react"
import { FotoBarang } from "../components/FotoBarang"
import { LabelWarna } from "../components/LabelWarna"
import { PengaturJumlah } from "../components/PengaturJumlah"
import { SetupCard } from "../components/SetupCard"
import { Badge, Button, Card, EmptyState, ErrorBox, Field, FormActions, LinkButton, Loading, PageHeader, SearchField, Sheet, cn, useConfirm, useToast } from "../components/ui"
import { setJumlahIsi, tambahIsi } from "../lib/api"
import { pesanError } from "../lib/errors"
import { cocokKata, formatAngka, labelBarang, labelJenis } from "../lib/format"
import { useBarangList, useDus, useIsiDus } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"
import type { Barang, JenisBarang } from "../types"

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
  const tampilan = useMemo(() => {
    return baris.filter((row) => {
      if (saring !== "semua" && row.barang.jenis !== saring) return false
      return cocokKata(cari, [row.barang.kode, row.barang.model, row.barang.warna, labelJenis(row.barang.jenis)])
    })
  }, [baris, cari, saring])
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
        title={data.kode}
        subtitle={
          <>
            <span className="flex min-w-0 items-center gap-1">
              <MapPin size={14} className="shrink-0 text-amber-300" />
              <span className="min-w-0 truncate">{data.lokasi || "Lokasi belum diisi"}</span>
            </span>
            <span className="mt-1 block">
              {formatAngka(data.total_pcs)} pcs · {formatAngka(data.jumlah_jenis)} model & warna
            </span>
          </>
        }
        back="/dus"
        action={
          <Link to={`/dus/${data.id}/edit`} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10" aria-label="Ubah dus">
            <Pencil size={18} />
          </Link>
        }
      />
      {data.catatan && <p className="mb-4 text-sm text-mist-300">{data.catatan}</p>}

      <div className="mb-4 flex gap-2">
        <Button variant="ghost" className="flex-1 !text-amber-300" onClick={() => setTambah(true)}><Plus size={18} /> Barang</Button>
        <LinkButton to={`/dus/${data.id}/pindah`} variant="ghost" className="flex-1 !text-amber-300">Pindahkan</LinkButton>
      </div>

      {baris.length === 0 ? (
        <EmptyState title="Dus ini kosong" body="Masukkan tas, botol minum, atau kotak makan yang disimpan di dus ini." action={<Button onClick={() => setTambah(true)}>Tambah barang</Button>} />
      ) : (
        <>
          <SearchField value={cari} onChange={setCari} placeholder="Cari jenis, model, atau warna barang" />
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
                    <FotoBarang kecil={row.barang.foto_kecil_url} penuh={row.barang.foto_url} nama={row.barang.model} />
                    <Link to={`/barang/${row.barang_id}`} className="min-w-0 flex-1">
                      <Badge tone={row.barang.jenis}>{labelJenis(row.barang.jenis)}</Badge>
                      <span className="mt-1 block truncate font-semibold">{row.barang.model}</span>
                      <LabelWarna nama={row.barang.warna} className="block text-sm text-mist-500" />
                      {jumlah === 0 && <span className="mt-1 block text-xs text-clay-400">Akan dikeluarkan saat disimpan</span>}
                    </Link>
                    <PengaturJumlah
                      nilai={jumlah}
                      min={0}
                      max={1000000}
                      label={row.barang.model}
                      onUbah={(berikutnya) => setDraft((now) => ({ ...(now ?? {}), [row.barang_id]: berikutnya }))}
                    />
                  </div>
                )
              })}
            </Card>
          )}
        </>
      )}

      {kotor && (
        <>
          <div className="h-14 md:hidden" aria-hidden />
          <div className="z-40 bg-ink-950 px-4 pt-3 max-md:fixed max-md:inset-x-0 max-md:bottom-[calc(var(--tinggi-nav-bawah)-0.25rem)] md:sticky md:bottom-4 md:mx-0 md:mt-4 md:px-0 md:py-3">
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
        </>
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
  katalog: Barang[]
  memuat: boolean
  onClose: () => void
  onSelesai: (pesan: string) => Promise<void>
}) {
  const [dipilih, setDipilih] = useState<string | null>(null)
  const [jumlah, setJumlah] = useState(1)
  const [catatan, setCatatan] = useState("")
  const [galat, setGalat] = useState<string | null>(null)
  const barang = katalog.find((item) => item.id === dipilih)
  const ada = dipilih ? sudahAda.get(dipilih) : undefined

  const simpan = useMutation({
    mutationFn: () => tambahIsi(dusId, dipilih!, jumlah, catatan),
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
            if (!dipilih) {
              setGalat("Pilih barang.")
              return
            }
            if (!Number.isInteger(jumlah) || jumlah < 1) {
              setGalat("Jumlah harus bilangan lebih dari 0.")
              return
            }
            setGalat(null)
            simpan.mutate()
          }}
        >
          <PilihBarang
            katalog={katalog}
            memuat={memuat}
            dipilih={dipilih}
            onPilih={(id) => {
              if (id !== dipilih) setJumlah(1)
              setDipilih(id)
              setGalat(null)
            }}
          />
          {barang && <FotoBarang kecil={barang.foto_kecil_url} penuh={barang.foto_url} nama={`${barang.model} · ${barang.warna}`} lebar />}
          <div>
            <span className="mb-1.5 block text-sm text-mist-300">Jumlah yang ditambahkan</span>
            <PengaturJumlah nilai={jumlah} min={1} max={1000000} label="jumlah" onUbah={setJumlah} />
          </div>
          <Field label="Catatan" hint="">
            <input className="field" placeholder="Opsional" value={catatan} maxLength={200} onChange={(event) => setCatatan(event.target.value)} />
          </Field>
          {galat && <p className="text-sm text-clay-400">{galat}</p>}
          <FormActions onCancel={onClose} pending={simpan.isPending} submitLabel="Masukkan ke dus" />
        </form>
      )}
    </Sheet>
  )
}

function PilihBarang({
  katalog,
  memuat,
  dipilih,
  onPilih,
}: {
  katalog: Barang[]
  memuat: boolean
  dipilih: string | null
  onPilih: (id: string | null) => void
}) {
  const daftarId = useId()
  const kotak = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [buka, setBuka] = useState(false)
  const [cari, setCari] = useState("")
  const [sorot, setSorot] = useState(0)
  const barang = katalog.find((item) => item.id === dipilih)
  const daftar = useMemo(() => {
    return katalog.filter((item) => cocokKata(cari, [item.kode, item.model, item.warna, labelJenis(item.jenis)]))
  }, [katalog, cari])
  const indeks = daftar.length === 0 ? 0 : Math.min(sorot, daftar.length - 1)
  const adaBersih = buka ? cari.length > 0 : Boolean(dipilih)

  useEffect(() => {
    if (!buka) return
    const el = panel.current?.querySelector<HTMLElement>(`[data-indeks="${indeks}"]`)
    const batas = panel.current
    if (!el || !batas) return
    const kotakDaftar = batas.getBoundingClientRect()
    const item = el.getBoundingClientRect()
    if (item.top < kotakDaftar.top) batas.scrollTop -= kotakDaftar.top - item.top
    else if (item.bottom > kotakDaftar.bottom) batas.scrollTop += item.bottom - kotakDaftar.bottom
  }, [buka, indeks, daftar.length])

  useEffect(() => {
    if (!buka) return
    function diLuar(event: MouseEvent) {
      if (!kotak.current?.contains(event.target as Node)) {
        setBuka(false)
        setCari("")
      }
    }
    document.addEventListener("click", diLuar, true)
    return () => document.removeEventListener("click", diLuar, true)
  }, [buka])

  function tutup() {
    setBuka(false)
    setCari("")
  }

  function pilih(id: string) {
    onPilih(id)
    tutup()
  }

  function bukaDaftar() {
    const index = katalog.findIndex((item) => item.id === dipilih)
    setSorot(index >= 0 ? index : 0)
    setBuka(true)
    input.current?.focus()
  }

  return (
    <div ref={kotak}>
      <span id={`${daftarId}-label`} className="mb-1.5 block text-sm text-mist-300">Barang</span>
      <div className="relative">
        <input
          ref={input}
          className={cn("field", adaBersih ? "pr-20" : "pr-11")}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={buka}
          aria-controls={daftarId}
          aria-labelledby={`${daftarId}-label`}
          aria-activedescendant={buka && daftar[indeks] ? `${daftarId}-${daftar[indeks].id}` : undefined}
          placeholder="Cari jenis, model, atau warna barang"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={buka ? cari : barang ? labelBarang(barang) : ""}
          onFocus={() => {
            if (!buka) bukaDaftar()
          }}
          onClick={() => {
            if (!buka) bukaDaftar()
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (!kotak.current?.contains(document.activeElement)) tutup()
            }, 150)
          }}
          onChange={(event) => {
            setCari(event.target.value)
            setSorot(0)
            setBuka(true)
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              if (!buka) bukaDaftar()
              else setSorot(indeks + 1)
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              if (buka) setSorot(Math.max(0, indeks - 1))
            } else if (event.key === "Enter" && buka) {
              event.preventDefault()
              const item = daftar[indeks]
              if (item) pilih(item.id)
            } else if (event.key === "Escape" && buka) {
              event.preventDefault()
              tutup()
            }
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {adaBersih && (
            <button
              type="button"
              className="grid h-11 w-11 place-items-center text-mist-400 hover:text-mist-100"
              aria-label="Hapus pilihan"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                onPilih(null)
                setCari("")
                setBuka(true)
                input.current?.focus()
              }}
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            className="grid h-11 w-11 place-items-center text-mist-400 hover:text-mist-100"
            aria-label={buka ? "Tutup daftar barang" : "Buka daftar barang"}
            aria-expanded={buka}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              if (buka) tutup()
              else bukaDaftar()
            }}
          >
            <ChevronDown size={18} className={buka ? "rotate-180" : undefined} />
          </button>
        </div>
      </div>
      {buka && (
        <div ref={panel} id={daftarId} role="listbox" aria-labelledby={`${daftarId}-label`} className="mt-1 max-h-56 overflow-auto rounded-xl border border-white/10 bg-ink-950">
          {memuat && <Loading letak="baris" />}
          {!memuat && daftar.length === 0 && <p className="px-3 py-3 text-sm text-mist-500">Tidak ada barang yang cocok.</p>}
          {daftar.map((item, i) => (
            <button
              key={item.id}
              id={`${daftarId}-${item.id}`}
              type="button"
              role="option"
              data-indeks={i}
              aria-selected={dipilih === item.id}
              tabIndex={-1}
              onPointerDown={(event) => event.preventDefault()}
              onMouseEnter={() => setSorot(i)}
              onClick={() => pilih(item.id)}
              className={cn(
                "block w-full px-3 py-2 text-left",
                dipilih === item.id ? "bg-amber-500/15" : i === indeks ? "bg-white/10" : "hover:bg-white/5",
              )}
            >
              <span className="block truncate font-medium">{labelJenis(item.jenis)} · {item.model} · <LabelWarna nama={item.warna} /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
