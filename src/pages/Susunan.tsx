import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Layers } from "lucide-react"
import { BalokSusunan } from "../components/BalokSusunan"
import { SetupCard } from "../components/SetupCard"
import { Button, ErrorBox, FormActions, Loading, PageHeader, Sheet, Stat, useToast } from "../components/ui"
import { simpanSusunan, type KolomSusunan } from "../lib/api"
import { pesanError } from "../lib/errors"
import { bandingKode } from "../lib/format"
import { useDusList, useSusunan } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"

function sampel(kode: string) {
  return kode.trim().toUpperCase().startsWith("S")
}

function keGrid(data: KolomSusunan[]) {
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

function salin(grid: string[][][]) {
  return grid.map((baris) => {
    const berikut: string[][] = []
    baris.forEach((kolom, indeks) => {
      if (kolom) berikut[indeks] = [...kolom]
    })
    return berikut
  })
}

function perluas(grid: string[][][], baris: number, kolom: number) {
  let g = salin(grid)
  let b = baris
  let k = kolom
  if (b < 0) {
    g = [[], ...g]
    b = 0
  }
  if (k < 0) {
    g = g.map((row) => {
      const berikut: string[][] = []
      row.forEach((cell, indeks) => {
        if (cell) berikut[indeks + 1] = cell
      })
      return berikut
    })
    k = 0
  }
  while (g.length <= b) g.push([])
  if (!g[b][k]) g[b][k] = []
  return { grid: g, baris: b, kolom: k }
}

function rapatkan(grid: string[][][]) {
  const lebar = grid.reduce((maks, baris) => Math.max(maks, baris.length), 0)
  return grid.map((baris) => Array.from({ length: lebar }, (_, indeks) => (baris[indeks] ? [...baris[indeks]] : [])))
}

function adaDus(grid: string[][][]) {
  return grid.some((baris) => baris.some((kolom) => (kolom?.length ?? 0) > 0))
}

function barisParkir(baris: string[][]) {
  let kosong = false
  for (const kolom of baris) {
    if (!kolom) continue
    if (kolom.length > 0) return false
    kosong = true
  }
  return kosong
}

function ukuran(grid: string[][][]) {
  const lebar = grid.reduce((maks, baris) => Math.max(maks, baris.length), 0)
  let parkirLebar = 0
  for (let indeks = 0; indeks < lebar; indeks += 1) {
    let kosong = false
    let berisi = false
    for (const baris of grid) {
      const kolom = baris[indeks]
      if (!kolom) continue
      if (kolom.length > 0) berisi = true
      else kosong = true
    }
    if (kosong && !berisi) parkirLebar += 1
  }
  return {
    panjang: grid.length,
    lebar,
    tinggi: grid.reduce((maks, baris) => baris.reduce((nilai, kolom) => Math.max(nilai, kolom?.length ?? 0), maks), 0),
    parkirPanjang: grid.filter(barisParkir).length,
    parkirLebar,
  }
}

type Posisi = { baris: number; kolom: number; tingkat: number }
type Sasaran = { baris: number; kolom: number; atas: boolean }

export function Susunan() {
  const siap = supabaseConfigured()
  const dus = useDusList()
  const susunan = useSusunan()
  const toast = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [grid, setGrid] = useState<string[][][] | null>(null)
  const [aktif, setAktif] = useState<Posisi | null>(null)
  const [sasaran, setSasaran] = useState<Sasaran | null>(null)

  useEffect(() => {
    if (!susunan.data || grid) return
    setGrid(keGrid(susunan.data))
  }, [susunan.data, grid])

  const kode = useMemo(() => new Map((dus.data ?? []).map((item) => [item.id, item.kode])), [dus.data])
  const terpakai = useMemo(() => new Set((grid ?? []).flat(2)), [grid])
  const bebas = useMemo(
    () => (dus.data ?? []).filter((item) => !sampel(item.kode) && !terpakai.has(item.id)).sort((a, b) => bandingKode(a.kode, b.kode)),
    [dus.data, terpakai],
  )
  const bentuk = ukuran(grid ?? [])
  const barisKosong = Boolean(sasaran && grid && !sasaran.atas && grid.length > 1 && grid[sasaran.baris]?.every((kolom) => kolom.length === 0))
  const sudahParkir = Boolean(sasaran && !sasaran.atas && sasaran.baris >= 0 && sasaran.kolom >= 0 && grid?.[sasaran.baris]?.[sasaran.kolom]?.length === 0)
  const bolehParkir = Boolean(sasaran && !sasaran.atas && !sudahParkir)
  const kolomKosong = Boolean(
    sasaran &&
      grid &&
      !sasaran.atas &&
      (grid[0]?.length ?? 0) > 1 &&
      grid.every((baris) => (baris[sasaran.kolom] ?? []).length === 0) &&
      sasaran.baris >= 0 &&
      sasaran.kolom >= 0 &&
      sasaran.baris < grid.length,
  )

  const simpan = useMutation({
    mutationFn: () => simpanSusunan(rapatkan(grid ?? [])),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["susunan"] })
      toast("Susunan disimpan.")
    },
    onError: (error) => toast(pesanError(error), "err"),
  })

  function pasang(id: string) {
    if (!sasaran || !grid) return
    const luas = perluas(grid, sasaran.baris, sasaran.kolom)
    const tingkat = luas.grid[luas.baris][luas.kolom].length
    luas.grid[luas.baris][luas.kolom] = [...luas.grid[luas.baris][luas.kolom], id]
    setGrid(luas.grid)
    setAktif({ baris: luas.baris, kolom: luas.kolom, tingkat })
    setSasaran(null)
  }

  function parkir() {
    if (!sasaran || !grid || sasaran.atas) return
    const luas = perluas(grid, sasaran.baris, sasaran.kolom)
    setGrid(luas.grid)
    setSasaran(null)
    setAktif(null)
  }

  function angkatBaris() {
    if (!sasaran || !grid || !barisKosong) return
    const berikut = grid.filter((_, indeks) => indeks !== sasaran.baris)
    setGrid(adaDus(berikut) ? berikut : [])
    setAktif(null)
    setSasaran(null)
  }

  function angkatKolom() {
    if (!sasaran || !grid || !kolomKosong) return
    const berikut = grid.map((baris) => {
      const hasil: string[][] = []
      baris.forEach((kolom, indeks) => {
        if (!kolom || indeks === sasaran.kolom) return
        hasil[indeks > sasaran.kolom ? indeks - 1 : indeks] = [...kolom]
      })
      return hasil
    })
    setGrid(adaDus(berikut) ? berikut : [])
    setAktif(null)
    setSasaran(null)
  }

  function hapus(posisi: Posisi) {
    setGrid((sekarang) => {
      if (!sekarang) return sekarang
      const berikut = sekarang.map((baris, i) => (i === posisi.baris ? baris.map((kolom, j) => (j === posisi.kolom ? kolom.filter((_, tingkat) => tingkat !== posisi.tingkat) : kolom)) : baris))
      return adaDus(berikut) ? berikut : []
    })
    setAktif(null)
  }

  function urutkan(baris: number, kolom: number, ids: string[]) {
    setGrid((sekarang) => sekarang?.map((row, i) => (i === baris ? row.map((cell, j) => (j === kolom ? ids : cell)) : row)) ?? sekarang)
  }

  function pindah(asal: Posisi, baris: number, kolom: number) {
    if (!grid) return
    const id = grid[asal.baris]?.[asal.kolom]?.[asal.tingkat]
    if (!id) return
    const tanpa = grid.map((row, i) => (i === asal.baris ? row.map((cell, j) => (j === asal.kolom ? cell.filter((_, tingkat) => tingkat !== asal.tingkat) : [...cell])) : row.map((cell) => [...cell])))
    const luas = perluas(tanpa, baris, kolom)
    luas.grid[luas.baris][luas.kolom] = [...luas.grid[luas.baris][luas.kolom], id]
    setGrid(adaDus(luas.grid) ? luas.grid : [])
    setAktif({ baris: luas.baris, kolom: luas.kolom, tingkat: luas.grid[luas.baris][luas.kolom].length - 1 })
  }

  const memuat = siap && (dus.isLoading || susunan.isLoading)
  const galat = dus.error ?? susunan.error

  return (
    <div className="min-w-0">
      <PageHeader icon={Layers} title="Susunan" subtitle="Panjang ke belakang, lebar ke samping, tinggi ke atas." back="/dus" />
      {!siap ? (
        <SetupCard />
      ) : memuat ? (
        <Loading letak="baris" />
      ) : galat || grid === null ? (
        <ErrorBox error={galat ?? new Error("Susunan tidak bisa dimuat.")} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Panjang" value={String(bentuk.panjang)} hint="ke belakang" extra={`${bentuk.parkirPanjang} parkir`} />
            <Stat label="Lebar" value={String(bentuk.lebar)} hint="ke samping" extra={`${bentuk.parkirLebar} parkir`} />
            <Stat label="Tinggi" value={String(bentuk.tinggi)} hint="ke atas" />
          </div>
          <div className="mt-3 max-w-full overflow-x-auto rounded-2xl border border-white/10 bg-ink-900/80 py-4">
            <div className="flex w-max min-w-full justify-center px-3">
              <BalokSusunan
                grid={grid}
                kode={kode}
                aktif={aktif}
                onPilihDus={setAktif}
                onKosong={(baris, kolom, atas) => setSasaran({ baris, kolom, atas })}
                onHapus={hapus}
                onUrut={urutkan}
                onPindah={pindah}
                onLepasPilih={() => setAktif(null)}
              />
            </div>
            <p className="px-3 text-center text-xs text-mist-500">Geser untuk memutar. Ketuk petak kosong untuk dus atau parkir. Tahan dus setengah detik untuk mengubah urutan.</p>
          </div>
          <p className="mt-3 text-sm text-mist-500">Dus S tidak masuk tumpukan. Dus yang tidak dipilih dihitung setelah seluruh tingkat tumpukan. Dus di belakang baru diambil kalau tidak tertutup dus di depannya.</p>
          <div className="mt-6">
            <FormActions onCancel={() => navigate("/dus")} pending={simpan.isPending} submitLabel="Simpan susunan" submitType="button" onSubmit={() => simpan.mutate()} />
          </div>
          {sasaran && (
            <Sheet title={sasaran.atas ? "Tambah di atas" : "Pilih dus"} onClose={() => setSasaran(null)}>
              {bebas.length === 0 && !bolehParkir ? (
                <p className="text-sm text-mist-500">Semua dus sudah disusun.</p>
              ) : (
                <select
                  className="field"
                  value=""
                  aria-label="Pilih dus"
                  onChange={(event) => {
                    const nilai = event.target.value
                    if (nilai === "parkir") parkir()
                    else if (nilai) pasang(nilai)
                  }}
                >
                  {bolehParkir && <option value="parkir">Parkir</option>}
                  <option value="" disabled hidden>
                    Pilih dus
                  </option>
                  {bebas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kode}
                    </option>
                  ))}
                </select>
              )}
              {barisKosong && (
                <Button type="button" variant="ghost" className="mt-2 w-full" onClick={angkatBaris}>
                  Hapus celah baris
                </Button>
              )}
              {kolomKosong && (
                <Button type="button" variant="ghost" className="mt-2 w-full" onClick={angkatKolom}>
                  Hapus celah kolom
                </Button>
              )}
            </Sheet>
          )}
        </>
      )}
    </div>
  )
}
