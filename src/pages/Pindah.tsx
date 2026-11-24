import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { SetupCard } from "../components/SetupCard"
import { Button, Card, EmptyState, ErrorBox, Field, Loading, PageHeader, useToast } from "../components/ui"
import { pindahSebagian, pindahSemua } from "../lib/api"
import { pesanError } from "../lib/errors"
import { formatAngka, labelJenis } from "../lib/format"
import { useDusList, useIsiDus } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"

type Mode = "sebagian" | "semua"

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
  const [mode, setMode] = useState<Mode>("sebagian")
  const [catatan, setCatatan] = useState("")
  const [pilihan, setPilihan] = useState<Record<string, { pilih: boolean; jumlah: string }>>({})

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
      if (mode === "semua") {
        await pindahSemua(id, tujuan, catatan)
        return
      }
      const item = (isi.data ?? [])
        .filter((row) => pilihan[row.barang_id]?.pilih)
        .map((row) => ({ barang_id: row.barang_id, jumlah: Number(pilihan[row.barang_id]?.jumlah), max: row.jumlah }))
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
      toast(mode === "semua" ? "Seluruh isi dus dipindahkan." : "Barang dipindahkan.")
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

  return (
    <div>
      <PageHeader
        kicker={asal.kode}
        title="Pindahkan barang"
        subtitle={asal.nama || asal.lokasi || "Dari dus ini ke dus lain."}
        back={`/dus/${id}`}
      />
      {baris.length === 0 ? (
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
          <div className="grid grid-cols-2 gap-2">
            <ModeTombol aktif={mode === "sebagian"} onClick={() => setMode("sebagian")}>Sebagian</ModeTombol>
            <ModeTombol aktif={mode === "semua"} onClick={() => setMode("semua")}>Seluruh isi</ModeTombol>
          </div>
          {mode === "semua" ? (
            <Card className="px-4 py-3 text-sm text-mist-300">
              Semua barang di dus ini, total {formatAngka(asal.total_pcs)} pcs, akan dipindahkan. Kalau dus tujuan sudah menyimpan barang yang sama, jumlahnya ditambahkan.
            </Card>
          ) : (
            <div className="space-y-2">
              {baris.map((row) => {
                const state = pilihan[row.barang_id] ?? { pilih: false, jumlah: String(row.jumlah) }
                return (
                  <label key={row.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/80 px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-amber-500"
                      checked={state.pilih}
                      onChange={(event) => setPilihan((now) => ({ ...now, [row.barang_id]: { ...state, pilih: event.target.checked } }))}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{row.barang.model}</span>
                      <span className="block text-xs text-mist-500">
                        {labelJenis(row.barang.jenis)} · {row.barang.warna} · stok {formatAngka(row.jumlah)}
                      </span>
                    </span>
                    <input
                      className="field w-20 px-2 text-center"
                      inputMode="numeric"
                      disabled={!state.pilih}
                      value={state.jumlah}
                      aria-label={`Jumlah ${row.barang.model}`}
                      onChange={(event) => setPilihan((now) => ({ ...now, [row.barang_id]: { ...state, jumlah: event.target.value } }))}
                    />
                  </label>
                )
              })}
            </div>
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
            <input className="field" maxLength={200} value={catatan} onChange={(event) => setCatatan(event.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={simpan.isPending}>
            {simpan.isPending ? "Memindahkan..." : mode === "semua" ? "Pindahkan seluruh isi" : "Pindahkan yang dipilih"}
          </Button>
        </form>
      )}
    </div>
  )
}

function ModeTombol({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={aktif ? "min-h-11 rounded-xl bg-amber-500 font-semibold text-ink-950" : "min-h-11 rounded-xl border border-white/10 font-semibold text-mist-300"}>
      {children}
    </button>
  )
}
