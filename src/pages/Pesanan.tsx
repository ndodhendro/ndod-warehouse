import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ClipboardList, Trash2 } from "lucide-react"
import { BalokRencana, type BarisIsi } from "../components/BalokRencana"
import { FotoBarang } from "../components/FotoBarang"
import { LabelWarna } from "../components/LabelWarna"
import { PengaturJumlah } from "../components/PengaturJumlah"
import { PilihBarang } from "../components/PilihBarang"
import { SetupCard } from "../components/SetupCard"
import { Badge, Button, Card, ErrorBox, Loading, PageHeader, useConfirm, useToast } from "../components/ui"
import { keluarkanPesanan } from "../lib/api"
import { pesanError } from "../lib/errors"
import { formatAngka, labelBarang, labelJenis } from "../lib/format"
import { useBarangList, useDusList, useStokDus, useSusunan } from "../lib/queries"
import { rencanaAmbil, type LetakDus } from "../lib/rencanaAmbil"
import { supabaseConfigured } from "../lib/supabase"

type Baris = { barangId: string; jumlah: number }

function keGrid(data: { baris: number; urutan: number; dusId: string[] }[]) {
  if (data.length === 0) return []
  const panjang = Math.max(...data.map((item) => item.baris))
  const lebar = Math.max(...data.map((item) => item.urutan))
  const grid = Array.from({ length: panjang }, () => Array.from({ length: lebar }, () => [] as string[]))
  for (const item of data) {
    const baris = grid[item.baris - 1]
    if (baris) baris[item.urutan - 1] = item.dusId
  }
  return grid
}

export function Pesanan() {
  const siap = supabaseConfigured()
  const barang = useBarangList()
  const dus = useDusList()
  const stok = useStokDus()
  const susunan = useSusunan()
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [baris, setBaris] = useState<Baris[]>([])

  const petaBarang = useMemo(() => new Map((barang.data ?? []).map((item) => [item.id, item])), [barang.data])
  const kodeDus = useMemo(() => new Map((dus.data ?? []).map((item) => [item.id, item.kode])), [dus.data])
  const letak = useMemo<LetakDus[]>(() => {
    const hasil: LetakDus[] = []
    const ada = new Set<string>()
    for (const kolom of susunan.data ?? []) {
      kolom.dusId.forEach((dusId, tingkat) => {
        hasil.push({ dusId, kode: kodeDus.get(dusId) ?? dusId, baris: kolom.baris, kolom: kolom.urutan, tingkat: tingkat + 1 })
        ada.add(dusId)
      })
    }
    for (const item of stok.data ?? []) {
      if (ada.has(item.dusId)) continue
      hasil.push({ dusId: item.dusId, kode: item.kode, baris: null, kolom: null, tingkat: null })
      ada.add(item.dusId)
    }
    return hasil
  }, [susunan.data, stok.data, kodeDus])

  const rencana = useMemo(
    () => rencanaAmbil(baris, letak, stok.data ?? []),
    [baris, letak, stok.data],
  )
  const grid = useMemo(() => keGrid(susunan.data ?? []), [susunan.data])
  const idSusunan = useMemo(() => new Set(grid.flat(2)), [grid])
  const sorot = useMemo(() => {
    const hasil = new Set<string>()
    for (const item of rencana.baris) {
      if (idSusunan.has(item.dusId)) hasil.add(item.dusId)
    }
    return hasil
  }, [rencana.baris, idSusunan])
  const diLuar = rencana.baris.filter((item) => !idSusunan.has(item.dusId))
  const isiSorot = useMemo(() => {
    const peta = new Map<string, BarisIsi[]>()
    for (const item of rencana.baris) {
      if (!idSusunan.has(item.dusId)) continue
      const data = petaBarang.get(item.barangId)
      if (!data) continue
      const daftar = peta.get(item.dusId) ?? []
      daftar.push({ jenis: labelJenis(data.jenis), model: data.model, warna: data.warna, jumlah: `${formatAngka(item.jumlah)} pcs` })
      peta.set(item.dusId, daftar)
    }
    return peta
  }, [rencana.baris, idSusunan, petaBarang])

  const kurang = rencana.kurang.flatMap((item) => {
    const data = petaBarang.get(item.barangId)
    return data ? [{ ...item, barang: data }] : []
  })

  const simpan = useMutation({
    mutationFn: () => keluarkanPesanan(rencana.baris.map((item) => ({ dusId: item.dusId, barangId: item.barangId, jumlah: item.jumlah }))),
    onSuccess: async () => {
      await qc.invalidateQueries()
      setBaris([])
      toast("Stok dikurangi.")
    },
    onError: (error) => toast(pesanError(error), "err"),
  })

  function tambah(id: string | null) {
    if (!id) return
    setBaris((sekarang) => {
      const ada = sekarang.find((barisItem) => barisItem.barangId === id)
      if (!ada) return [...sekarang, { barangId: id, jumlah: 1 }]
      return sekarang.map((barisItem) => (barisItem.barangId === id ? { ...barisItem, jumlah: barisItem.jumlah + 1 } : barisItem))
    })
  }

  async function kurangi() {
    const isi = rencana.baris
      .map((item) => {
        const data = petaBarang.get(item.barangId)
        const nama = data ? `${data.model} ${data.warna}` : "barang"
        return `${item.kode}, ${nama}, ${formatAngka(item.jumlah)} pcs`
      })
      .join(". ")
    const boleh = await confirm({ title: "Kurangi stok?", body: isi, confirmLabel: "Kurangi stok" })
    if (boleh) simpan.mutate()
  }

  const memuat = siap && (barang.isLoading || dus.isLoading || stok.isLoading || susunan.isLoading)
  const galat = barang.error ?? dus.error ?? stok.error ?? susunan.error
  const susunanKosong = (susunan.data ?? []).every((item) => item.dusId.length === 0)

  return (
    <div className="min-w-0">
      <PageHeader icon={ClipboardList} title="Pesanan" subtitle="" />
      {!siap ? (
        <SetupCard />
      ) : memuat ? (
        <Loading letak="baris" />
      ) : galat ? (
        <ErrorBox error={galat} />
      ) : (
        <>
          <PilihBarang katalog={barang.data ?? []} memuat={barang.isLoading} dipilih={null} onPilih={tambah} maksTampil={5} />
          {baris.length > 0 && (
            <Card className="mt-4 divide-y divide-white/5">
              {baris.map((item) => {
                const data = petaBarang.get(item.barangId)
                if (!data) return null
                return (
                  <div key={item.barangId} className="flex items-center gap-3 px-4 py-3">
                    <FotoBarang kecil={data.foto_kecil_url} penuh={data.foto_url} nama={data.model} />
                    <span className="min-w-0 flex-1">
                      <Badge tone={data.jenis}>{labelJenis(data.jenis)}</Badge>
                      <span className="mt-1 block truncate font-semibold">{data.model}</span>
                      <LabelWarna nama={data.warna} className="block text-sm text-mist-500" />
                    </span>
                    <PengaturJumlah nilai={item.jumlah} min={1} max={100000} onUbah={(jumlah) => setBaris((sekarang) => sekarang.map((barisItem) => (barisItem.barangId === item.barangId ? { ...barisItem, jumlah } : barisItem)))} label={data.model} />
                    <button type="button" className="grid h-11 w-11 place-items-center text-amber-400" aria-label={`Hapus ${data.model}`} onClick={() => setBaris((sekarang) => sekarang.filter((barisItem) => barisItem.barangId !== item.barangId))}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                )
              })}
            </Card>
          )}
          {susunanKosong && baris.length > 0 && (
            <p className="mt-4 text-sm text-mist-500">
              Susunan belum diisi. Dus D dihitung tanpa tingkat tumpukan.{" "}
              <Link to="/dus/susunan" className="text-amber-300">Isi susunan</Link>
            </p>
          )}
          {sorot.size > 0 && (
            <div className="mt-4 max-w-full overflow-x-auto rounded-2xl border border-white/10 bg-ink-900/80 py-4">
              <div className="flex w-max min-w-full justify-center px-3">
                <BalokRencana grid={grid} kode={kodeDus} sorot={sorot} isi={isiSorot} />
              </div>
              <p className="px-3 text-center text-xs text-mist-500">Oranye = dus yang dibuka. Ketuk dus oranye untuk melihat barang yang dikeluarkan. Geser untuk memutar. Ketuk area kosong agar dus lain transparan.</p>
            </div>
          )}
          {diLuar.length > 0 && (
            <>
              {sorot.size > 0 && <p className="mt-4 text-sm text-mist-500">Dus ini tidak ada di susunan.</p>}
              <Card className={sorot.size > 0 ? "mt-2 divide-y divide-white/5" : "mt-4 divide-y divide-white/5"}>
                {diLuar.map((item) => {
                  const data = petaBarang.get(item.barangId)
                  return (
                    <div key={`${item.dusId}-${item.barangId}`} className="px-4 py-3">
                      <span className="block font-semibold">{item.kode}</span>
                      <span className="text-sm text-mist-500">{data ? labelBarang(data) : "Barang"} · {formatAngka(item.jumlah)} pcs</span>
                    </div>
                  )
                })}
              </Card>
            </>
          )}
          {kurang.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-400/50 bg-amber-500/15 px-4 py-3">
              {kurang.map((item) => (
                <p key={item.barangId} className="font-semibold text-amber-200">
                  {item.barang.model} {item.barang.warna} kurang {formatAngka(item.jumlah)} pcs
                </p>
              ))}
            </div>
          )}
          <Button type="button" className="mt-6 w-full" disabled={rencana.baris.length === 0 || simpan.isPending} onClick={() => void kurangi()}>
            {simpan.isPending ? "Mengurangi..." : "Kurangi stok"}
          </Button>
        </>
      )}
    </div>
  )
}
