import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Minus, Plus } from "lucide-react"
import { LabelWarna } from "../components/LabelWarna"
import { SetupCard } from "../components/SetupCard"
import { EmptyState, ErrorBox, Field, FormActions, Loading, PageHeader, useToast } from "../components/ui"
import { pindahSebagian, pindahSemua } from "../lib/api"
import { pesanError } from "../lib/errors"
import { formatAngka, labelJenis } from "../lib/format"
import { useDusList, useIsiDus } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"
import type { IsiDus } from "../types"

type StatusBaris = { pilih: boolean; jumlah: string }
type Pilihan = Record<string, StatusBaris>

function statusBaris(row: IsiDus, pilihan: Pilihan, fokus: boolean): StatusBaris {
  return pilihan[row.barang_id] ?? { pilih: fokus, jumlah: String(row.jumlah) }
}

function jumlahBaris(row: IsiDus, pilihan: Pilihan, fokus: boolean) {
  const jumlah = Number(statusBaris(row, pilihan, fokus).jumlah)
  return Number.isInteger(jumlah) ? jumlah : row.jumlah
}

function isiPenuh(rows: IsiDus[], pilihan: Pilihan) {
  return rows.length > 0 && rows.every((row) => {
    const state = pilihan[row.barang_id]
    return Boolean(state?.pilih) && Number(state.jumlah) === row.jumlah
  })
}

export function Pindah() {
  const { id = "" } = useParams()
  const [params] = useSearchParams()
  const awal = params.get("barang")
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const dus = useDusList()
  const isi = useIsiDus(id)
  const [tujuan, setTujuan] = useState("")
  const [catatan, setCatatan] = useState("")
  const [pilihan, setPilihan] = useState<Pilihan>({})

  useEffect(() => {
    if (!isi.data) return
    setPilihan((prev) => {
      const next = { ...prev }
      for (const row of isi.data) {
        if (!next[row.barang_id]) {
          next[row.barang_id] = { pilih: awal === row.barang_id, jumlah: String(row.jumlah) }
        }
      }
      return next
    })
  }, [isi.data, awal])

  const asal = (dus.data ?? []).find((item) => item.id === id)
  const calonTujuan = (dus.data ?? []).filter((item) => item.id !== id)

  const simpan = useMutation({
    mutationFn: async () => {
      if (!tujuan) throw new Error("Pilih dus tujuan.")
      const sumber = isi.data ?? []
      if (!awal && isiPenuh(sumber, pilihan)) {
        await pindahSemua(id, tujuan, catatan)
        return
      }
      const item = sumber
        .filter((row) => (awal ? row.barang_id === awal : pilihan[row.barang_id]?.pilih))
        .map((row) => ({ barang_id: row.barang_id, jumlah: Number(pilihan[row.barang_id]?.jumlah ?? row.jumlah), max: row.jumlah }))
      if (item.length === 0) throw new Error("Pilih barang yang akan dipindahkan.")
      for (const baris of item) {
        if (!Number.isInteger(baris.jumlah) || baris.jumlah < 1) throw new Error("Jumlah pindah harus bilangan lebih dari 0.")
        if (baris.jumlah > baris.max) throw new Error("Jumlah pindah melebihi stok di dus asal.")
      }
      await pindahSebagian(
        id,
        tujuan,
        item.map(({ barang_id, jumlah }) => ({ barang_id, jumlah })),
        catatan,
      )
    },
    onSuccess: async () => {
      await qc.invalidateQueries()
      toast(!awal && isiPenuh(isi.data ?? [], pilihan) ? "Seluruh isi dus dipindahkan." : "Barang dipindahkan.")
      navigate(`/dus/${tujuan}`, { replace: true })
    },
    onError: (error) => toast(pesanError(error), "err"),
  })

  if (!supabaseConfigured()) {
    return (
      <div>
        <PageHeader title="Pindahkan" back="/dus" />
        <SetupCard />
      </div>
    )
  }
  if (dus.isLoading || isi.isLoading) return <Loading />
  if (dus.error || isi.error) return <ErrorBox error={dus.error ?? isi.error} />
  if (!asal) return <PageHeader title="Dus tidak ditemukan" back="/dus" />

  const baris = isi.data ?? []
  const fokus = awal ? baris.find((row) => row.barang_id === awal) : undefined
  const daftar = fokus ? [fokus] : baris
  const semuaCentang = daftar.length > 0 && daftar.every((row) => statusBaris(row, pilihan, Boolean(fokus)).pilih)
  const sebagianCentang = daftar.some((row) => statusBaris(row, pilihan, Boolean(fokus)).pilih) && !semuaCentang
  const pcsTerpilih = daftar.reduce((total, row) => {
    if (!statusBaris(row, pilihan, Boolean(fokus)).pilih) return total
    return total + jumlahBaris(row, pilihan, Boolean(fokus))
  }, 0)
  const seluruhIsi = !awal && isiPenuh(daftar, pilihan)

  const aturSemua = (centang: boolean) => {
    setPilihan((now) => {
      const next = { ...now }
      for (const row of daftar) {
        const sebelumnya = now[row.barang_id] ?? { pilih: false, jumlah: String(row.jumlah) }
        next[row.barang_id] = {
          pilih: centang,
          jumlah: centang ? String(row.jumlah) : sebelumnya.jumlah,
        }
      }
      return next
    })
  }

  return (
    <div>
      <PageHeader
        kicker={asal.kode}
        title={fokus ? `Pindahkan ${fokus.barang.model}` : "Pindahkan barang"}
        subtitle={fokus ? <>{labelJenis(fokus.barang.jenis)} · <LabelWarna nama={fokus.barang.warna} /></> : asal.nama || asal.lokasi || "Dari dus ini ke dus lain."}
        back={awal ? `/barang/${awal}` : `/dus/${id}`}
      />
      {awal && !fokus ? (
        <EmptyState title="Barang tidak ada di dus ini" body="Stok barang ini di dus asal sudah habis atau sudah dipindahkan." />
      ) : baris.length === 0 ? (
        <EmptyState title="Dus asal kosong" body="Tidak ada barang yang bisa dipindahkan." />
      ) : calonTujuan.length === 0 ? (
        <EmptyState title="Perlu dus tujuan" body="Buat dus lain dulu, lalu pindahkan stok ke sana." />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            simpan.mutate()
          }}
        >
          <div className="space-y-2">
            {!fokus && daftar.length > 1 && (
              <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/80 px-3 py-3">
                <KotakCentang checked={semuaCentang} indeterminate={sebagianCentang} onChange={aturSemua} />
                <span className="min-w-0 flex-1 font-semibold">Pilih semua</span>
                <span className="text-sm font-semibold tabular-nums text-mist-300">{formatAngka(pcsTerpilih)} pcs</span>
              </label>
            )}
            {daftar.map((row) => {
              const state = statusBaris(row, pilihan, Boolean(fokus))
              const nilai = jumlahBaris(row, pilihan, Boolean(fokus))
              const ubahJumlah = (berikutnya: number) => {
                const terbatas = Math.min(row.jumlah, Math.max(1, berikutnya))
                setPilihan((now) => {
                  const current = now[row.barang_id] ?? { pilih: Boolean(fokus), jumlah: String(row.jumlah) }
                  return { ...now, [row.barang_id]: { ...current, jumlah: String(terbatas) } }
                })
              }
              return (
                <div key={row.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/80 px-3 py-3">
                  {!fokus && (
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-amber-500"
                      checked={state.pilih}
                      aria-label={`Pilih ${row.barang.model}, ${row.barang.warna}`}
                      onChange={(event) => {
                        const centang = event.target.checked
                        setPilihan((now) => {
                          const current = now[row.barang_id] ?? { pilih: Boolean(fokus), jumlah: String(row.jumlah) }
                          return { ...now, [row.barang_id]: { ...current, pilih: centang } }
                        })
                      }}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{row.barang.model}</span>
                    <span className="block text-xs text-mist-500">
                      {labelJenis(row.barang.jenis)} · <LabelWarna nama={row.barang.warna} /> · stok {formatAngka(row.jumlah)}
                    </span>
                  </span>
                  <div className={state.pilih ? "flex items-center gap-1" : "flex items-center gap-1 opacity-40"}>
                    <button type="button" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10" aria-label={`Kurangi ${row.barang.model}`} disabled={!state.pilih} onClick={() => ubahJumlah(nilai - 1)}>
                      <Minus size={16} />
                    </button>
                    <span className="w-10 text-center font-semibold tabular-nums">{formatAngka(nilai)}</span>
                    <button type="button" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10" aria-label={`Tambah ${row.barang.model}`} disabled={!state.pilih} onClick={() => ubahJumlah(nilai + 1)}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {seluruhIsi && (
            <p className="text-sm text-mist-300">
              Semua barang di dus ini, total {formatAngka(pcsTerpilih)} pcs, akan dipindahkan. Kalau dus tujuan sudah menyimpan barang yang sama, jumlahnya ditambahkan.
            </p>
          )}
          <Field label="Dus tujuan">
            <select className="field" required value={tujuan} onChange={(event) => setTujuan(event.target.value)}>
              <option value="">Pilih dus</option>
              {calonTujuan.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.kode}
                  {item.nama ? ` · ${item.nama}` : ""}
                  {item.lokasi ? ` · ${item.lokasi}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Catatan" hint="Opsional. Misalnya pindah rak atau gabung dus.">
            <input className="field" placeholder="Opsional" maxLength={200} value={catatan} onChange={(event) => setCatatan(event.target.value)} />
          </Field>
          <FormActions
            onCancel={() => navigate(awal ? `/barang/${awal}` : `/dus/${id}`)}
            pending={simpan.isPending}
            pendingLabel="Memindahkan..."
            submitLabel={seluruhIsi ? "Pindahkan seluruh isi" : fokus ? "Pindahkan" : "Pindahkan yang dipilih"}
          />
        </form>
      )}
    </div>
  )
}

function KotakCentang({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: (checked: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-5 w-5 accent-amber-500"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
  )
}
