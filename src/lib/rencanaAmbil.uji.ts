import { rencanaAmbil, type LetakDus, type StokDus } from "./rencanaAmbil"

function letakAtas(kode: string[]): LetakDus[] {
  return kode.map((item, indeks) => ({ dusId: item, kode: item, kolom: indeks + 1, tingkat: 1 }))
}

function stok(baris: [string, string, number][]): StokDus[] {
  return baris.map(([dus, barang, jumlah]) => ({ dusId: dus, kode: dus, barangId: barang, jumlah }))
}

function ringkas(hasil: ReturnType<typeof rencanaAmbil>) {
  return {
    baris: hasil.baris.map((item) => `${item.kode}:${item.barangId}:${item.jumlah}`).sort(),
    kurang: hasil.kurang.map((item) => `${item.barangId}:${item.jumlah}`).sort(),
  }
}

function sama(nama: string, dapat: unknown, harap: unknown) {
  const a = JSON.stringify(dapat)
  const b = JSON.stringify(harap)
  if (a !== b) throw new Error(`${nama}\n dapat ${a}\n harap ${b}`)
}

const atas = letakAtas(["D15", "D20", "D21"])
sama(
  "empat tambah dua",
  ringkas(rencanaAmbil([{ barangId: "mint", jumlah: 6 }], atas, stok([["D15", "mint", 4], ["D20", "mint", 2], ["D21", "mint", 3]]))),
  { baris: ["D15:mint:4", "D20:mint:2"], kurang: [] },
)

sama(
  "tiga tambah tiga",
  ringkas(rencanaAmbil([{ barangId: "mint", jumlah: 6 }], atas, stok([["D15", "mint", 5], ["D20", "mint", 3], ["D21", "mint", 3]]))),
  { baris: ["D20:mint:3", "D21:mint:3"], kurang: [] },
)

sama(
  "lima lalu sisa di nomor kecil",
  ringkas(rencanaAmbil([{ barangId: "mint", jumlah: 6 }], atas, stok([["D15", "mint", 5], ["D20", "mint", 2], ["D21", "mint", 2]]))),
  { baris: ["D15:mint:5", "D20:mint:1"], kurang: [] },
)

sama(
  "dus yang sudah terbuka",
  ringkas(rencanaAmbil(
    [{ barangId: "mint", jumlah: 7 }, { barangId: "lain", jumlah: 1 }],
    atas,
    stok([["D15", "mint", 5], ["D20", "mint", 2], ["D21", "mint", 3], ["D21", "lain", 1]]),
  )),
  { baris: ["D15:mint:5", "D21:lain:1", "D21:mint:2"], kurang: [] },
)

const bertingkat: LetakDus[] = [
  { dusId: "D01", kode: "D01", kolom: 1, tingkat: 1 },
  { dusId: "D02", kode: "D02", kolom: 1, tingkat: 2 },
  { dusId: "D03", kode: "D03", kolom: 1, tingkat: 3 },
  { dusId: "D06", kode: "D06", kolom: 2, tingkat: 3 },
  { dusId: "D09", kode: "D09", kolom: 3, tingkat: 3 },
]
sama(
  "tujuh dari puncak",
  ringkas(rencanaAmbil(
    [{ barangId: "mint", jumlah: 7 }],
    bertingkat,
    stok([["D03", "mint", 3], ["D02", "mint", 4], ["D01", "mint", 2], ["D06", "mint", 3], ["D09", "mint", 3]]),
  )),
  { baris: ["D03:mint:3", "D06:mint:3", "D09:mint:1"], kurang: [] },
)

sama(
  "kurang lalu sampel",
  ringkas(rencanaAmbil(
    [{ barangId: "mint", jumlah: 5 }],
    [{ dusId: "D15", kode: "D15", kolom: 1, tingkat: 1 }, { dusId: "S0", kode: "S0", kolom: null, tingkat: null }],
    stok([["D15", "mint", 2], ["S0", "mint", 1]]),
  )),
  { baris: ["D15:mint:2", "S0:mint:1"], kurang: ["mint:2"] },
)

console.log("rencana ambil lulus")
