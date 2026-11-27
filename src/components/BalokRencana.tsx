import { useRef, useState, type PointerEvent as AcaraPenunjuk } from "react"
import { warnaTeks } from "../lib/warna"

const LEBAR = 34
const DALAM = 17
const TINGGI = 24
const PINGGIR = 48
const SKALA_X = LEBAR * Math.SQRT2
const SKALA_Z = DALAM * Math.SQRT2
const SUDUT_AWAL = Math.PI / 4

type Titik = { x: number; y: number }
type Petak = { baris: number; kolom: number }

const KAYU = [
  { nama: "depan", a: 0, b: 1, nu: 0, nv: -1, isi: "#8d6a3f" },
  { nama: "kanan", a: 1, b: 2, nu: 1, nv: 0, isi: "#c49a62" },
  { nama: "belakang", a: 2, b: 3, nu: 0, nv: 1, isi: "#6f5432" },
  { nama: "kiri", a: 3, b: 0, nu: -1, nv: 0, isi: "#a07c48" },
] as const

const ORANYE = [
  { nama: "depan", a: 0, b: 1, nu: 0, nv: -1, isi: "#e07a1a" },
  { nama: "kanan", a: 1, b: 2, nu: 1, nv: 0, isi: "#ff9f3d" },
  { nama: "belakang", a: 2, b: 3, nu: 0, nv: 1, isi: "#b85a0c" },
  { nama: "kiri", a: 3, b: 0, nu: -1, nv: 0, isi: "#f08a28" },
] as const

const ORANYE_TUA = [
  { nama: "depan", a: 0, b: 1, nu: 0, nv: -1, isi: "#b8470c" },
  { nama: "kanan", a: 1, b: 2, nu: 1, nv: 0, isi: "#d4651a" },
  { nama: "belakang", a: 2, b: 3, nu: 0, nv: 1, isi: "#8a3208" },
  { nama: "kiri", a: 3, b: 0, nu: -1, nv: 0, isi: "#c25210" },
] as const

const UKURAN_ISI = 12
const TINGGI_BARIS_ISI = 16
const PAD_X_ISI = 10
const PAD_Y_ISI = 8
const CELAH_ISI = 14

type Kotak = { minX: number; minY: number; maxX: number; maxY: number }
type Panel = { x: number; y: number; lebar: number; tinggi: number }
type WarnaDus = "kayu" | "oranye" | "tua"

export type BarisIsi = { jenis: string; model: string; warna: string; jumlah: string }

function teksBaris(baris: BarisIsi) {
  return `${baris.jenis} . ${baris.model} . ${baris.warna} . ${baris.jumlah}`
}

const CAT_DUS = {
  kayu: { sisi: KAYU, atap: "#f0d7b4", garis: "#3a2a1c", tebal: 1 },
  oranye: { sisi: ORANYE, atap: "#ffd7a8", garis: "#9a3412", tebal: 1.5 },
  tua: { sisi: ORANYE_TUA, atap: "#e39a4a", garis: "#7c2d12", tebal: 2 },
} as const

function keLayar(u: number, v: number, tingkat: number, sudut: number) {
  const cos = Math.cos(sudut)
  const sin = Math.sin(sudut)
  const ax = u * cos + v * sin
  const az = u * sin - v * cos
  return { x: ax * SKALA_X, y: az * SKALA_Z - tingkat * TINGGI, az }
}

function menghadap(nu: number, nv: number, sudut: number) {
  return nu * Math.sin(sudut) - nv * Math.cos(sudut) > 0.05
}

function rangkaian(titik: Titik[]) {
  return titik.map((item) => `${item.x},${item.y}`).join(" ")
}

function pojok(kolom: number, baris: number, tingkat: number, sudut: number) {
  return [
    keLayar(kolom - 0.5, baris - 0.5, tingkat, sudut),
    keLayar(kolom + 0.5, baris - 0.5, tingkat, sudut),
    keLayar(kolom + 0.5, baris + 0.5, tingkat, sudut),
    keLayar(kolom - 0.5, baris + 0.5, tingkat, sudut),
  ]
}

function letakTulisan(titik: Titik[], sudut: number) {
  const sin = Math.sin(sudut)
  const cos = Math.cos(sudut)
  let arah = -Infinity
  let a = titik[0]
  let b = titik[1]
  for (const sisi of KAYU) {
    const hadap = sisi.nu * sin - sisi.nv * cos
    if (hadap <= arah) continue
    arah = hadap
    a = titik[sisi.a]
    b = titik[sisi.b]
  }
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2 + TINGGI / 2,
    muka: [a, b, { x: b.x, y: b.y + TINGGI }, { x: a.x, y: a.y + TINGGI }],
  }
}

function diDalam(titik: Titik, sudut: Titik[]) {
  let dalam = false
  for (let i = 0, j = sudut.length - 1; i < sudut.length; j = i, i += 1) {
    const a = sudut[i]
    const b = sudut[j]
    if ((a.y > titik.y) !== (b.y > titik.y) && titik.x < ((b.x - a.x) * (titik.y - a.y)) / (b.y - a.y) + a.x) dalam = !dalam
  }
  return dalam
}

function mukaDus(titik: Titik[], sudut: number) {
  const muka = KAYU.filter((sisi) => menghadap(sisi.nu, sisi.nv, sudut)).map((sisi) => [
    titik[sisi.a],
    titik[sisi.b],
    { x: titik[sisi.b].x, y: titik[sisi.b].y + TINGGI },
    { x: titik[sisi.a].x, y: titik[sisi.a].y + TINGGI },
  ])
  muka.push(titik)
  return muka
}

function batasKotak(titik: Titik[]): Kotak {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const item of titik) {
    minX = Math.min(minX, item.x)
    minY = Math.min(minY, item.y)
    maxX = Math.max(maxX, item.x)
    maxY = Math.max(maxY, item.y + TINGGI)
  }
  return { minX, minY, maxX, maxY }
}

let pengukurTeks: CanvasRenderingContext2D | null | undefined

function lebarTeks(teks: string) {
  if (pengukurTeks === undefined) pengukurTeks = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d")
  if (!pengukurTeks) return Math.ceil(teks.length * 7.5)
  pengukurTeks.font = `600 ${UKURAN_ISI}px Manrope, sans-serif`
  return Math.ceil(pengukurTeks.measureText(teks).width * 1.2 + 4)
}

function bersinggungan(panel: Panel, kotak: Kotak, jarak: number) {
  return panel.x < kotak.maxX + jarak && panel.x + panel.lebar > kotak.minX - jarak && panel.y < kotak.maxY + jarak && panel.y + panel.tinggi > kotak.minY - jarak
}

function letakPanel(kotak: Kotak, lain: Kotak[], lebar: number, tinggi: number): Panel {
  const tengahX = (kotak.minX + kotak.maxX) / 2
  const tengahY = (kotak.minY + kotak.maxY) / 2
  const calon: Panel[] = [
    { x: kotak.maxX + CELAH_ISI, y: tengahY - tinggi / 2, lebar, tinggi },
    { x: kotak.minX - CELAH_ISI - lebar, y: tengahY - tinggi / 2, lebar, tinggi },
    { x: tengahX - lebar / 2, y: kotak.minY - CELAH_ISI - tinggi, lebar, tinggi },
    { x: tengahX - lebar / 2, y: kotak.maxY + CELAH_ISI, lebar, tinggi },
  ]
  const urut = calon
    .map((panel) => {
      const kena = bersinggungan(panel, kotak, 2) ? 1 : 0
      const tutup = lain.reduce((jumlah, batas) => jumlah + (bersinggungan(panel, batas, 0) ? 1 : 0), 0)
      const jauh = Math.hypot(panel.x + lebar / 2 - tengahX, panel.y + tinggi / 2 - tengahY)
      return { panel, skor: kena * 1000 + tutup * 100 + jauh }
    })
    .sort((a, b) => a.skor - b.skor)
  const panel = urut[0].panel
  if (!bersinggungan(panel, kotak, 8)) return panel
  const dx = panel.x + lebar / 2 - tengahX
  const dy = panel.y + tinggi / 2 - tengahY
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { ...panel, x: dx >= 0 ? kotak.maxX + CELAH_ISI : kotak.minX - CELAH_ISI - lebar }
  }
  return { ...panel, y: dy >= 0 ? kotak.maxY + CELAH_ISI : kotak.minY - CELAH_ISI - tinggi }
}

function BadanDus({ titik, sudut, warna }: { titik: Titik[]; sudut: number; warna: WarnaDus }) {
  const cat = CAT_DUS[warna]
  return (
    <>
      {cat.sisi.filter((sisi) => menghadap(sisi.nu, sisi.nv, sudut)).map((sisi) => (
        <polygon
          key={sisi.nama}
          points={rangkaian([
            titik[sisi.a],
            titik[sisi.b],
            { x: titik[sisi.b].x, y: titik[sisi.b].y + TINGGI },
            { x: titik[sisi.a].x, y: titik[sisi.a].y + TINGGI },
          ])}
          fill={sisi.isi}
          stroke={cat.garis}
          strokeWidth={cat.tebal}
        />
      ))}
      <polygon points={rangkaian(titik)} fill={cat.atap} stroke={cat.garis} strokeWidth={cat.tebal} />
    </>
  )
}

function TulisanDus({ x, y, nama, muka, id }: { x: number; y: number; nama: string; muka: Titik[]; id: string }) {
  const kunci = `rencana-${id}`
  return (
    <>
      <clipPath id={kunci}>
        <polygon points={rangkaian(muka)} />
      </clipPath>
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#f4efe6" fontSize={11} fontWeight={700} fontFamily="Manrope, sans-serif" stroke="#101412" strokeWidth={2} paintOrder="stroke" pointerEvents="none" clipPath={`url(#${kunci})`}>
        {nama}
      </text>
    </>
  )
}

function PanelIsi({ panel, baris }: { panel: Panel; baris: BarisIsi[] }) {
  return (
    <g onPointerDown={(event) => event.stopPropagation()}>
      <clipPath id="rencana-isi">
        <rect x={panel.x} y={panel.y} width={panel.lebar} height={panel.tinggi} rx={8} />
      </clipPath>
      <rect x={panel.x} y={panel.y} width={panel.lebar} height={panel.tinggi} rx={8} fill="#161b19" stroke="rgba(255,255,255,0.16)" />
      <g clipPath="url(#rencana-isi)">
        {baris.map((item, indeks) => (
          <text
            key={`${indeks}-${teksBaris(item)}`}
            x={panel.x + PAD_X_ISI}
            y={panel.y + PAD_Y_ISI + TINGGI_BARIS_ISI / 2 + indeks * TINGGI_BARIS_ISI}
            fill="#f4efe6"
            fontSize={UKURAN_ISI}
            fontWeight={600}
            fontFamily="Manrope, sans-serif"
            dominantBaseline="middle"
          >
            {`${item.jenis} . ${item.model} . `}
            <tspan fill={warnaTeks(item.warna) ?? "#f4efe6"}>{item.warna}</tspan>
            {` . ${item.jumlah}`}
          </text>
        ))}
      </g>
    </g>
  )
}

function keKoordinat(svg: SVGSVGElement, x: number, y: number) {
  const titik = svg.createSVGPoint()
  titik.x = x
  titik.y = y
  const matriks = svg.getScreenCTM()
  if (!matriks) return { x, y }
  const lokal = titik.matrixTransform(matriks.inverse())
  return { x: lokal.x, y: lokal.y }
}

type Gestur = { id: number; x: number; y: number; sudut: number; putar: boolean; batal: boolean }

export function BalokRencana({ grid, kode, sorot, isi }: { grid: string[][][]; kode: Map<string, string>; sorot: Set<string>; isi: Map<string, BarisIsi[]> }) {
  const [sudut, setSudut] = useState(SUDUT_AWAL)
  const [fokus, setFokus] = useState(false)
  const [pilih, setPilih] = useState<string | null>(null)
  const gestur = useRef<Gestur | null>(null)
  const dipilih = pilih && sorot.has(pilih) ? pilih : null

  const daftar: Petak[] = []
  grid.forEach((baris, indeksBaris) => {
    baris.forEach((tumpukan, indeksKolom) => {
      if (tumpukan.length > 0) daftar.push({ baris: indeksBaris, kolom: indeksKolom })
    })
  })
  if (daftar.length === 0) return null

  const urutan = daftar
    .map((item) => ({ ...item, az: keLayar(item.kolom, item.baris, 0, sudut).az }))
    .sort((a, b) => a.az - b.az || a.baris - b.baris || a.kolom - b.kolom)

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const ikut = (titik: Titik) => {
    minX = Math.min(minX, titik.x)
    minY = Math.min(minY, titik.y)
    maxX = Math.max(maxX, titik.x)
    maxY = Math.max(maxY, titik.y)
  }
  const kotakLayar: { id: string; batas: Kotak }[] = []
  for (const item of daftar) {
    const tumpukan = grid[item.baris]?.[item.kolom] ?? []
    tumpukan.forEach((id, tingkat) => {
      const titik = pojok(item.kolom, item.baris, tingkat, sudut)
      titik.forEach((pojokTitik) => {
        ikut(pojokTitik)
        ikut({ x: pojokTitik.x, y: pojokTitik.y + TINGGI })
      })
      const tulisan = letakTulisan(titik, sudut)
      ikut({ x: tulisan.x - 18, y: tulisan.y - 8 })
      ikut({ x: tulisan.x + 18, y: tulisan.y + 8 })
      kotakLayar.push({ id, batas: batasKotak(titik) })
    })
  }
  const uTengah = (Math.min(...daftar.map((item) => item.kolom)) + Math.max(...daftar.map((item) => item.kolom))) / 2
  const tanda = keLayar(uTengah, Math.min(...daftar.map((item) => item.baris)) - 2.2, 0, sudut)
  ikut({ x: tanda.x - 58, y: tanda.y - 12 })
  ikut({ x: tanda.x + 58, y: tanda.y + 12 })
  const barisIsi = dipilih ? isi.get(dipilih) ?? [] : []
  const sasaran = kotakLayar.find((item) => item.id === dipilih)
  const lebarIsi = barisIsi.reduce((maks, item) => Math.max(maks, lebarTeks(teksBaris(item))), 0)
  const panel = sasaran && barisIsi.length > 0
    ? letakPanel(
        sasaran.batas,
        [
          ...kotakLayar.filter((item) => item.id !== dipilih).map((item) => item.batas),
          { minX: tanda.x - 58, minY: tanda.y - 12, maxX: tanda.x + 58, maxY: tanda.y + 12 },
        ],
        lebarIsi + PAD_X_ISI * 2,
        barisIsi.length * TINGGI_BARIS_ISI + PAD_Y_ISI * 2,
      )
    : null
  if (panel) {
    ikut({ x: panel.x, y: panel.y })
    ikut({ x: panel.x + panel.lebar, y: panel.y + panel.tinggi })
  }

  const lebar = maxX - minX + PINGGIR * 2
  const tinggiGambar = maxY - minY + PINGGIR * 2
  const indeksDepan = urutan.findIndex((item) => item.az > tanda.az)
  const tulisanDepan = (
    <text x={tanda.x} y={tanda.y} textAnchor="middle" dominantBaseline="middle" fill="#c5cec6" fontSize={12} fontWeight={700} fontFamily="Manrope, sans-serif" pointerEvents="none">
      tampak depan
    </text>
  )
  const penghalang = daftar.flatMap((item) => {
    const tumpukan = grid[item.baris]?.[item.kolom] ?? []
    const az = keLayar(item.kolom, item.baris, 0, sudut).az
    return tumpukan.flatMap((id, tingkat) => {
      if (fokus && !sorot.has(id)) return []
      return [{ az, muka: mukaDus(pojok(item.kolom, item.baris, tingkat, sudut), sudut) }]
    })
  })

  function tekan(event: AcaraPenunjuk<SVGSVGElement>) {
    if (event.button !== 0 || gestur.current) return
    gestur.current = { id: event.pointerId, x: event.clientX, y: event.clientY, sudut, putar: false, batal: false }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Penunjuk sintetis tidak bisa ditangkap.
    }
  }

  function gerak(event: AcaraPenunjuk<SVGSVGElement>) {
    const g = gestur.current
    if (!g || event.pointerId !== g.id) return
    const dx = event.clientX - g.x
    const dy = event.clientY - g.y
    if (!g.putar && Math.hypot(dx, dy) > 10) g.batal = true
    if (!g.putar && Math.abs(dx) >= 8 && Math.abs(dx) > Math.abs(dy)) g.putar = true
    if (!g.putar) return
    event.preventDefault()
    setSudut(g.sudut - (dx * Math.PI) / 180)
  }

  function cariDus(titik: Titik) {
    for (let i = urutan.length - 1; i >= 0; i -= 1) {
      const item = urutan[i]
      const tumpukan = grid[item.baris]?.[item.kolom] ?? []
      for (let tingkat = tumpukan.length - 1; tingkat >= 0; tingkat -= 1) {
        const id = tumpukan[tingkat]
        if (fokus && !sorot.has(id)) continue
        const muka = mukaDus(pojok(item.kolom, item.baris, tingkat, sudut), sudut)
        if (muka.some((sisi) => diDalam(titik, sisi))) return id
      }
    }
    return null
  }

  function lepas(event: AcaraPenunjuk<SVGSVGElement>) {
    const g = gestur.current
    if (!g || event.pointerId !== g.id) return
    gestur.current = null
    if (g.putar || g.batal) return
    const id = cariDus(keKoordinat(event.currentTarget, event.clientX, event.clientY))
    if (id && sorot.has(id)) {
      setPilih((sekarang) => (sekarang === id ? null : id))
      return
    }
    setFokus((nilai) => !nilai)
  }

  function batal(event: AcaraPenunjuk<SVGSVGElement>) {
    const g = gestur.current
    if (!g || event.pointerId !== g.id) return
    gestur.current = null
  }

  function putar(langkah: number) {
    setSudut((nilai) => nilai + langkah)
  }

  return (
    <svg
      width={lebar}
      height={tinggiGambar}
      viewBox={`${minX - PINGGIR} ${minY - PINGGIR} ${lebar} ${tinggiGambar}`}
      role="group"
      tabIndex={0}
      aria-label={dipilih ? `Dus ${kode.get(dipilih) ?? ""} dipilih. ${barisIsi.map(teksBaris).join(", ")}. Ketuk dus itu lagi untuk menutup. Geser mendatar untuk memutar.` : fokus ? "Susunan dus, fokus pada dus yang dibuka. Ketuk dus oranye untuk melihat barang yang dikeluarkan. Ketuk area kosong untuk melihat semua. Geser mendatar untuk memutar." : "Susunan dus. Oranye adalah dus yang dibuka. Ketuk dus oranye untuk melihat barang yang dikeluarkan. Geser mendatar untuk memutar. Ketuk area kosong untuk fokus."}
      className="block shrink-0 touch-none select-none outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={tekan}
      onPointerMove={gerak}
      onPointerUp={lepas}
      onPointerCancel={batal}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          setFokus((nilai) => !nilai)
        } else if (event.key === "ArrowLeft") {
          event.preventDefault()
          putar(Math.PI / 12)
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          putar(-Math.PI / 12)
        }
      }}
    >
      {urutan.map((item, indeks) => {
        const tumpukan = grid[item.baris]?.[item.kolom] ?? []
        return (
          <g key={`${item.baris}-${item.kolom}`}>
            {indeks === indeksDepan ? tulisanDepan : null}
            {tumpukan.map((id, tingkat) => {
              const titik = pojok(item.kolom, item.baris, tingkat, sudut)
              const oranye = sorot.has(id)
              const pudar = fokus && !oranye
              const tulisan = letakTulisan(titik, sudut)
              const azKotak = keLayar(item.kolom, item.baris, 0, sudut).az
              const terhalang = penghalang.some((lain) => lain.az > azKotak + 0.02 && lain.muka.some((sudutMuka) => diDalam(tulisan, sudutMuka)))
              const warna = oranye ? (id === dipilih ? "tua" : "oranye") : "kayu"
              return (
                <g key={id} opacity={pudar ? 0.22 : 1}>
                  <BadanDus titik={titik} sudut={sudut} warna={warna} />
                  {!pudar && !terhalang && <TulisanDus x={tulisan.x} y={tulisan.y} nama={kode.get(id) ?? ""} muka={tulisan.muka} id={id} />}
                </g>
              )
            })}
          </g>
        )
      })}
      {indeksDepan === -1 ? tulisanDepan : null}
      {panel ? <PanelIsi panel={panel} baris={barisIsi} /> : null}
    </svg>
  )
}
