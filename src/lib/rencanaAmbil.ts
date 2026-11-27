import { bandingKode } from "./format"

export type LetakDus = {
  dusId: string
  kode: string
  kolom: number | null
  tingkat: number | null
}

export type StokDus = {
  dusId: string
  kode: string
  barangId: string
  jumlah: number
}

export type BarisAmbil = {
  dusId: string
  kode: string
  barangId: string
  jumlah: number
}

export type Kekurangan = {
  barangId: string
  jumlah: number
}

export type RencanaAmbil = {
  baris: BarisAmbil[]
  kurang: Kekurangan[]
}

type Kandidat = {
  dusId: string
  kode: string
  stok: Map<string, number>
}

type Ambil = { dusId: string; kode: string; barangId: string; jumlah: number; penuh: boolean }

type Opsi = { ambil: Ambil[]; partial: number; dus: string[] }

function golongan(kode: string) {
  const awal = kode.trim().toUpperCase()
  if (awal.startsWith("S")) return "s"
  if (awal.startsWith("D")) return "d"
  return "lain"
}

function kedalaman(letak: LetakDus, semua: LetakDus[]) {
  const kolom = letak.kolom
  const tingkat = letak.tingkat
  if (kolom === null || tingkat === null) return null
  return semua.filter((item) => item.kolom === kolom && item.tingkat !== null && item.tingkat > tingkat).length
}

function alokasi(sumber: { dusId: string; kode: string; jumlah: number }[], target: number): Opsi[] {
  const n = sumber.length
  const hasil: Opsi[] = []
  const batas = n > 14 ? 0 : 1 << n
  for (let mask = 0; mask < batas; mask += 1) {
    let jumlah = 0
    const penuh: number[] = []
    for (let i = 0; i < n; i += 1) {
      if ((mask & (1 << i)) === 0) continue
      jumlah += sumber[i].jumlah
      penuh.push(i)
    }
    if (jumlah === target) {
      hasil.push(jadiOpsi(sumber, penuh, null))
      continue
    }
    if (jumlah >= target) continue
    const sisa = target - jumlah
    for (let j = 0; j < n; j += 1) {
      if ((mask & (1 << j)) !== 0) continue
      if (sumber[j].jumlah > sisa) hasil.push(jadiOpsi(sumber, penuh, { indeks: j, ambil: sisa }))
    }
  }
  if (hasil.length > 0) return hasil
  return [alokasiGreedy(sumber, target)]
}

function jadiOpsi(
  sumber: { dusId: string; kode: string; jumlah: number }[],
  penuh: number[],
  sebagian: { indeks: number; ambil: number } | null,
): Opsi {
  const ambil: Ambil[] = penuh.map((indeks) => ({
    dusId: sumber[indeks].dusId,
    kode: sumber[indeks].kode,
    barangId: "",
    jumlah: sumber[indeks].jumlah,
    penuh: true,
  }))
  if (sebagian) {
    ambil.push({
      dusId: sumber[sebagian.indeks].dusId,
      kode: sumber[sebagian.indeks].kode,
      barangId: "",
      jumlah: sebagian.ambil,
      penuh: false,
    })
  }
  return {
    ambil,
    partial: sebagian ? 1 : 0,
    dus: ambil.map((item) => item.dusId),
  }
}

function alokasiGreedy(sumber: { dusId: string; kode: string; jumlah: number }[], target: number): Opsi {
  const urut = [...sumber].sort((a, b) => b.jumlah - a.jumlah || bandingKode(a.kode, b.kode))
  const ambil: Ambil[] = []
  let sisa = target
  for (const item of urut) {
    if (sisa <= 0) break
    const jumlah = Math.min(item.jumlah, sisa)
    ambil.push({ dusId: item.dusId, kode: item.kode, barangId: "", jumlah, penuh: jumlah === item.jumlah })
    sisa -= jumlah
  }
  return { ambil, partial: ambil.filter((item) => !item.penuh).length, dus: ambil.map((item) => item.dusId) }
}

type Skor = { baru: number; partial: number; penuh: number; kode: string; sisa: string; ambil: Ambil[] }

function lebihBaik(calon: Skor, juara: Skor | null) {
  if (!juara) return true
  if (calon.baru !== juara.baru) return calon.baru < juara.baru
  if (calon.partial !== juara.partial) return calon.partial < juara.partial
  if (calon.penuh !== juara.penuh) return calon.penuh > juara.penuh
  if (calon.kode !== juara.kode) return calon.kode < juara.kode
  return calon.sisa > juara.sisa
}

function pilihKelompok(kandidat: Kandidat[], sisa: Map<string, number>, sudah: Set<string>) {
  const barang = [...sisa.entries()].filter(([, jumlah]) => jumlah > 0).map(([id]) => id)
  const relevan = kandidat.filter((dus) => barang.some((id) => (dus.stok.get(id) ?? 0) > 0 && (sisa.get(id) ?? 0) > 0))
  const target = new Map<string, number>()
  for (const id of barang) {
    const ada = relevan.reduce((jumlah, dus) => jumlah + (dus.stok.get(id) ?? 0), 0)
    const minta = sisa.get(id) ?? 0
    if (ada > 0 && minta > 0) target.set(id, Math.min(minta, ada))
  }
  if (target.size === 0) return [] as Ambil[]

  const opsi = [...target.entries()].map(([barangId, jumlah]) => {
    const sumber = relevan
      .map((dus) => ({ dusId: dus.dusId, kode: dus.kode, jumlah: dus.stok.get(barangId) ?? 0 }))
      .filter((item) => item.jumlah > 0)
    return alokasi(sumber, jumlah).map((item) => ({
      ...item,
      ambil: item.ambil.map((baris) => ({ ...baris, barangId })),
    }))
  })

  const produk = opsi.reduce((jumlah, daftar) => jumlah * Math.max(daftar.length, 1), 1)
  if (produk > 200000) return greedyKelompok(opsi, sudah)

  const juara: { nilai: Skor | null } = { nilai: null }
  const telusur = (indeks: number, terpakai: Set<string>, partial: number, penuh: number, ambil: Ambil[]) => {
    if (indeks === opsi.length) {
      const baru = [...terpakai].filter((id) => !sudah.has(id)).length
      const kode = ambil
        .map((item) => item.kode)
        .filter((nilai, urut, daftar) => daftar.indexOf(nilai) === urut)
        .sort(bandingKode)
        .join("\n")
      const sisa = ambil
        .filter((item) => !item.penuh)
        .map((item) => item.kode)
        .sort(bandingKode)
        .join("\n")
      const calon = { baru, partial, penuh, kode, sisa, ambil }
      if (lebihBaik(calon, juara.nilai)) juara.nilai = calon
      return
    }
    for (const pilihan of opsi[indeks]) {
      const berikut = new Set(terpakai)
      for (const id of pilihan.dus) berikut.add(id)
      const penuhBerikut = penuh + pilihan.ambil.filter((item) => item.penuh).reduce((jumlah, item) => jumlah + item.jumlah, 0)
      telusur(indeks + 1, berikut, partial + pilihan.partial, penuhBerikut, ambil.concat(pilihan.ambil))
    }
  }
  telusur(0, new Set(), 0, 0, [])
  return juara.nilai ? juara.nilai.ambil : []
}

function greedyKelompok(opsi: Opsi[][], sudah: Set<string>) {
  const terpakai = new Set(sudah)
  const ambil: Ambil[] = []
  for (const daftar of opsi) {
    const urut = [...daftar].sort((a, b) => {
      const baruA = a.dus.filter((id) => !terpakai.has(id)).length
      const baruB = b.dus.filter((id) => !terpakai.has(id)).length
      if (baruA !== baruB) return baruA - baruB
      if (a.partial !== b.partial) return a.partial - b.partial
      return a.dus.join().localeCompare(b.dus.join())
    })
    const pilih = urut[0]
    if (!pilih) continue
    for (const id of pilih.dus) terpakai.add(id)
    ambil.push(...pilih.ambil)
  }
  return ambil
}

function kelompokkan(letak: LetakDus[], stok: StokDus[]) {
  const peta = new Map(letak.map((item) => [item.dusId, item]))
  const kandidat = new Map<string, Kandidat>()
  for (const baris of stok) {
    if (baris.jumlah <= 0) continue
    const ada = kandidat.get(baris.dusId) ?? { dusId: baris.dusId, kode: baris.kode, stok: new Map() }
    ada.stok.set(baris.barangId, (ada.stok.get(baris.barangId) ?? 0) + baris.jumlah)
    kandidat.set(baris.dusId, ada)
  }

  const tingkat = new Map<number, Kandidat[]>()
  const luar: Kandidat[] = []
  const sampel: Kandidat[] = []
  let terdalam = -1
  for (const dus of kandidat.values()) {
    const posisi = peta.get(dus.dusId)
    const jenis = golongan(posisi?.kode ?? dus.kode)
    if (jenis === "s") {
      sampel.push(dus)
      continue
    }
    if (posisi && posisi.kolom !== null && posisi.tingkat !== null && jenis === "d") {
      const dalam = kedalaman(posisi, letak.filter((item) => golongan(item.kode) === "d"))
      terdalam = Math.max(terdalam, dalam ?? -1)
      const daftar = tingkat.get(dalam ?? 0) ?? []
      daftar.push(dus)
      tingkat.set(dalam ?? 0, daftar)
      continue
    }
    luar.push(dus)
  }
  const urutan: Kandidat[][] = []
  for (let dalam = 0; dalam <= terdalam; dalam += 1) urutan.push(tingkat.get(dalam) ?? [])
  urutan.push(luar)
  urutan.push(sampel)
  return urutan
}

export function rencanaAmbil(permintaan: { barangId: string; jumlah: number }[], letak: LetakDus[], stok: StokDus[]): RencanaAmbil {
  const sisa = new Map<string, number>()
  for (const baris of permintaan) {
    if (baris.jumlah <= 0) continue
    sisa.set(baris.barangId, (sisa.get(baris.barangId) ?? 0) + baris.jumlah)
  }
  const sudah = new Set<string>()
  const baris: BarisAmbil[] = []
  for (const kelompok of kelompokkan(letak, stok)) {
    const ambil = pilihKelompok(kelompok, sisa, sudah)
    for (const item of ambil) {
      sudah.add(item.dusId)
      sisa.set(item.barangId, (sisa.get(item.barangId) ?? 0) - item.jumlah)
      baris.push({ dusId: item.dusId, kode: item.kode, barangId: item.barangId, jumlah: item.jumlah })
    }
  }
  const kurang = [...sisa.entries()]
    .filter(([, jumlah]) => jumlah > 0)
    .map(([barangId, jumlah]) => ({ barangId, jumlah }))
  return { baris, kurang }
}
