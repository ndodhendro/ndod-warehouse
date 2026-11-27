import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as AcaraPenunjuk, type ReactNode } from "react"

const LEBAR = 34
const DALAM = 17
const TINGGI = 24
const PINGGIR = 48
const SKALA_X = LEBAR * Math.SQRT2
const SKALA_Z = DALAM * Math.SQRT2
const SUDUT_AWAL = Math.PI / 4

type Titik = { x: number; y: number }
type Posisi = { baris: number; kolom: number; tingkat: number }
type Sasaran = { baris: number; kolom: number }

type Seret = {
  id: string
  barisAsal: number
  kolomAsal: number
  tingkat: number
  x: number
  y: number
  ox: number
  oy: number
  sasaran: Sasaran | null
}

type Petak = { baris: number; kolom: number; macam: "isi" | "parkir" | "halo" }

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
  return titik.map((titik) => `${titik.x},${titik.y}`).join(" ")
}

function pojok(kolom: number, baris: number, tingkat: number, sudut: number) {
  return [
    keLayar(kolom - 0.5, baris - 0.5, tingkat, sudut),
    keLayar(kolom + 0.5, baris - 0.5, tingkat, sudut),
    keLayar(kolom + 0.5, baris + 0.5, tingkat, sudut),
    keLayar(kolom - 0.5, baris + 0.5, tingkat, sudut),
  ]
}

function susunUlang(kolom: string[], dariAtas: number, keAtas: number) {
  const visual = [...kolom].reverse()
  const [item] = visual.splice(dariAtas, 1)
  if (!item) return kolom
  visual.splice(keAtas, 0, item)
  return visual.reverse()
}

function petak(grid: string[][][]) {
  if (grid.length === 0) return [{ baris: 0, kolom: 0, macam: "halo" as const }]
  const hasil: Petak[] = []
  const ada = new Set<string>()
  grid.forEach((baris, indeksBaris) => {
    baris.forEach((tumpukan, indeksKolom) => {
      if (!tumpukan) return
      ada.add(`${indeksBaris},${indeksKolom}`)
      hasil.push({ baris: indeksBaris, kolom: indeksKolom, macam: tumpukan.length === 0 ? "parkir" : "isi" })
    })
  })
  for (const item of [...hasil]) {
    for (const [db, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const baris = item.baris + db
      const kolom = item.kolom + dk
      const kunci = `${baris},${kolom}`
      if (ada.has(kunci)) continue
      ada.add(kunci)
      hasil.push({ baris, kolom, macam: "halo" })
    }
  }
  return hasil
}

function titikSvg(svg: SVGSVGElement, x: number, y: number) {
  const titik = svg.createSVGPoint()
  titik.x = x
  titik.y = y
  const matriks = svg.getScreenCTM()
  if (!matriks) return { x: 0, y: 0 }
  const hasil = titik.matrixTransform(matriks.inverse())
  return { x: hasil.x, y: hasil.y }
}

const SISI = [
  { nama: "depan", a: 0, b: 1, nu: 0, nv: -1, isi: "#8d6a3f", pilih: "#a35a3e" },
  { nama: "kanan", a: 1, b: 2, nu: 1, nv: 0, isi: "#c49a62", pilih: "#c47a52" },
  { nama: "belakang", a: 2, b: 3, nu: 0, nv: 1, isi: "#6f5432", pilih: "#8a4e36" },
  { nama: "kiri", a: 3, b: 0, nu: -1, nv: 0, isi: "#a07c48", pilih: "#b56a48" },
] as const

function BadanDus({ titik, sudut, dipilih, tepi }: { titik: Titik[]; sudut: number; dipilih: boolean; tepi: string }) {
  return (
    <>
      {SISI.filter((sisi) => menghadap(sisi.nu, sisi.nv, sudut)).map((sisi) => (
        <polygon
          key={sisi.nama}
          points={rangkaian([
            titik[sisi.a],
            titik[sisi.b],
            { x: titik[sisi.b].x, y: titik[sisi.b].y + TINGGI },
            { x: titik[sisi.a].x, y: titik[sisi.a].y + TINGGI },
          ])}
          fill={dipilih ? sisi.pilih : sisi.isi}
          stroke={tepi}
          strokeWidth={dipilih ? 1.5 : 1}
        />
      ))}
      <polygon points={rangkaian(titik)} fill={dipilih ? "#ffe7c2" : "#f0d7b4"} stroke={tepi} strokeWidth={dipilih ? 2 : 1} />
    </>
  )
}

function letakTulisan(titik: Titik[], sudut: number) {
  const sin = Math.sin(sudut)
  const cos = Math.cos(sudut)
  let arah = -Infinity
  let a = titik[0]
  let b = titik[1]
  for (const sisi of SISI) {
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
  const muka = SISI.filter((sisi) => menghadap(sisi.nu, sisi.nv, sudut)).map((sisi) => [
    titik[sisi.a],
    titik[sisi.b],
    { x: titik[sisi.b].x, y: titik[sisi.b].y + TINGGI },
    { x: titik[sisi.a].x, y: titik[sisi.a].y + TINGGI },
  ])
  muka.push(titik)
  return muka
}

type Jejak = { baris: number; kolom: number; tingkat: number }
type Geser = { dx: number; dy: number; lembut: boolean }
type Hantu = Jejak & { kunci: string; id: string; nama: string }

function gerakHalus() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function petakan(grid: string[][][]) {
  const hasil = new Map<string, Jejak>()
  grid.forEach((baris, indeksBaris) => {
    baris.forEach((tumpukan, indeksKolom) => {
      tumpukan?.forEach((id, tingkat) => hasil.set(id, { baris: indeksBaris, kolom: indeksKolom, tingkat }))
    })
  })
  return hasil
}

function mainkanGeser(el: SVGGElement, geser: Geser) {
  el.getAnimations().forEach((anim) => anim.cancel())
  const akhir = { transform: "translate(0px, 0px) scale(1, 1)" }
  el.animate(
    geser.lembut
      ? [
          { transform: `translate(${geser.dx}px, ${geser.dy}px) scale(1, 1)` },
          { transform: "translate(0px, 3px) scale(1.06, 0.92)", offset: 0.72 },
          { transform: "translate(0px, -2px) scale(0.98, 1.04)", offset: 0.86 },
          akhir,
        ]
      : [{ transform: `translate(${geser.dx}px, ${geser.dy}px) scale(1, 1)` }, akhir],
    { duration: geser.lembut ? 380 : 200, easing: "cubic-bezier(0.2, 0.85, 0.2, 1)", fill: "none" },
  )
}

function GerakDus({ masuk, geser, children }: { masuk: boolean; geser: Geser | null; children: ReactNode }) {
  const simpul = useRef<SVGGElement>(null)
  useLayoutEffect(() => {
    const el = simpul.current
    if (!el || gerakHalus()) return
    if (masuk) {
      el.getAnimations().forEach((anim) => anim.cancel())
      el.style.transform = ""
      el.classList.remove("dus-taruh")
      void el.getBoundingClientRect()
      el.classList.add("dus-taruh")
      const lepasKelas = () => el.classList.remove("dus-taruh")
      el.addEventListener("animationend", lepasKelas, { once: true })
      return () => el.removeEventListener("animationend", lepasKelas)
    }
    if (!geser) return
    el.classList.remove("dus-taruh")
    mainkanGeser(el, geser)
  }, [masuk, geser])
  return (
    <g ref={simpul} className="dus-gerak">
      {children}
    </g>
  )
}

function TulisanDus({ x, y, nama, muka, id }: { x: number; y: number; nama: string; muka: Titik[]; id: string }) {
  const kunci = `muka-${id}`
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

export function BalokSusunan({
  grid,
  kode,
  aktif,
  onPilihDus,
  onKosong,
  onHapus,
  onUrut,
  onPindah,
  onLepasPilih,
}: {
  grid: string[][][]
  kode: Map<string, string>
  aktif: Posisi | null
  onPilihDus: (posisi: Posisi) => void
  onKosong: (baris: number, kolom: number, atas: boolean) => void
  onHapus: (posisi: Posisi) => void
  onUrut: (baris: number, kolom: number, ids: string[]) => void
  onPindah: (asal: Posisi, baris: number, kolom: number) => void
  onLepasPilih: () => void
}) {
  const [sudut, setSudut] = useState(SUDUT_AWAL)
  const [tahan, setTahan] = useState<string | null>(null)
  const [seret, setSeret] = useState<Seret | null>(null)
  const [masuk, setMasuk] = useState<Set<string>>(new Set())
  const [geser, setGeser] = useState<Map<string, Geser>>(new Map())
  const [mendarat, setMendarat] = useState<({ id: string } & Geser) | null>(null)
  const [pergi, setPergi] = useState<Hantu[]>([])
  const svgRef = useRef<SVGSVGElement>(null)
  const gestur = useRef<{ id: number; x: number; y: number; kx: number; ky: number; sudut: number; mode: "tunggu" | "putar" | "urut"; batal: boolean; dusId?: string; baris?: number; kolom?: number; tingkat?: number } | null>(null)
  const timer = useRef<number | null>(null)
  const sudutRef = useRef(sudut)
  const gridRef = useRef(grid)
  const seretRef = useRef(seret)
  const onUrutRef = useRef(onUrut)
  const onPindahRef = useRef(onPindah)
  const jejak = useRef<Map<string, Jejak>>(new Map())
  const jejakSiap = useRef(false)
  const pegangan = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const kodeRef = useRef(kode)
  sudutRef.current = sudut
  gridRef.current = grid
  seretRef.current = seret
  onUrutRef.current = onUrut
  onPindahRef.current = onPindah
  kodeRef.current = kode

  useEffect(() => {
    const sekarang = petakan(grid)
    const lama = jejak.current
    jejak.current = sekarang
    if (!jejakSiap.current) {
      jejakSiap.current = true
      return
    }
    const sudutAktif = sudutRef.current
    const diTangan = seretRef.current?.id
    const tangan = pegangan.current
    pegangan.current = null
    const baruMasuk = new Set<string>()
    const baruGeser = new Map<string, Geser>()
    const hilang: Hantu[] = []
    for (const [id, pos] of sekarang) {
      const dulu = lama.get(id)
      if (!dulu) {
        baruMasuk.add(id)
        continue
      }
      if (id === diTangan) continue
      if (dulu.baris === pos.baris && dulu.kolom === pos.kolom && dulu.tingkat === pos.tingkat) continue
      const dari = keLayar(dulu.kolom, dulu.baris, dulu.tingkat, sudutAktif)
      const ke = keLayar(pos.kolom, pos.baris, pos.tingkat, sudutAktif)
      let dx = dari.x - ke.x
      let dy = dari.y - ke.y
      const lembut = tangan?.id === id
      if (lembut) {
        dx += tangan.dx
        dy += tangan.dy
      }
      if (Math.hypot(dx, dy) < 0.5) continue
      baruGeser.set(id, { dx, dy, lembut })
    }
    const saat = Date.now()
    for (const [id, pos] of lama) {
      if (sekarang.has(id)) continue
      hilang.push({ kunci: `${id}-${saat}`, id, nama: kodeRef.current.get(id) ?? "", ...pos })
    }
    setMasuk(baruMasuk)
    setGeser(baruGeser)
    if (hilang.length > 0 && !gerakHalus()) setPergi((ada) => [...ada, ...hilang])
  }, [grid])

  useEffect(() => {
    if (!mendarat) return
    const timer = window.setTimeout(() => setMendarat(null), 420)
    return () => window.clearTimeout(timer)
  }, [mendarat])

  useEffect(() => {
    if (pergi.length === 0) return
    const kunci = new Set(pergi.map((item) => item.kunci))
    const timer = window.setTimeout(() => {
      setPergi((ada) => ada.filter((item) => !kunci.has(item.kunci)))
    }, 400)
    return () => window.clearTimeout(timer)
  }, [pergi])

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const daftar = petak(grid)
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
  for (const item of daftar) {
    const tumpukan = grid[item.baris]?.[item.kolom] ?? []
    pojok(item.kolom, item.baris, 0, sudut).forEach((titik) => ikut(item.macam === "isi" ? titik : { x: titik.x, y: titik.y + TINGGI }))
    tumpukan.forEach((_, tingkat) => {
      const titik = pojok(item.kolom, item.baris, tingkat, sudut)
      titik.forEach((pojokTitik) => {
        ikut(pojokTitik)
        ikut({ x: pojokTitik.x, y: pojokTitik.y + TINGGI })
      })
      const tulisan = letakTulisan(titik, sudut)
      ikut({ x: tulisan.x - 18, y: tulisan.y - 8 })
      ikut({ x: tulisan.x + 18, y: tulisan.y + 8 })
    })
    if (tumpukan.length > 0) pojok(item.kolom, item.baris, tumpukan.length, sudut).forEach(ikut)
  }
  const uTengah = (Math.min(...daftar.map((item) => item.kolom)) + Math.max(...daftar.map((item) => item.kolom))) / 2
  const tanda = keLayar(uTengah, Math.min(...daftar.map((item) => item.baris)) - 2.2, 0, sudut)
  ikut({ x: tanda.x - 58, y: tanda.y - 12 })
  ikut({ x: tanda.x + 58, y: tanda.y + 12 })

  const lebar = maxX - minX + PINGGIR * 2
  const tinggiGambar = maxY - minY + PINGGIR * 2
  const indeksDepan = urutan.findIndex((item) => item.az > tanda.az)
  const tulisanDepan = (
    <text x={tanda.x} y={tanda.y} textAnchor="middle" dominantBaseline="middle" fill="#c5cec6" fontSize={12} fontWeight={700} fontFamily="Manrope, sans-serif" pointerEvents="none">
      tampak depan
    </text>
  )
  const fokus = seret ? { baris: seret.barisAsal, kolom: seret.kolomAsal } : aktif
  const lokasiSeret = seret ? cariDus(grid, seret.id) : null
  const penghalang = daftar.flatMap((item) => {
    if (item.macam !== "isi") return []
    if (fokus && (item.baris !== fokus.baris || item.kolom !== fokus.kolom)) return []
    const tumpukan = grid[item.baris]?.[item.kolom] ?? []
    const az = keLayar(item.kolom, item.baris, 0, sudut).az
    return tumpukan.flatMap((id, tingkat) => (seret?.id === id ? [] : [{ az, muka: mukaDus(pojok(item.kolom, item.baris, tingkat, sudut), sudut) }]))
  })

  function baca(target: EventTarget | null) {
    const simpul = target instanceof Element ? target.closest("[data-aksi]") : null
    if (!simpul) return null
    return {
      aksi: simpul.getAttribute("data-aksi") ?? "",
      baris: Number(simpul.getAttribute("data-baris")),
      kolom: Number(simpul.getAttribute("data-kolom")),
      tingkat: Number(simpul.getAttribute("data-tingkat") ?? "-1"),
      atas: simpul.getAttribute("data-atas") === "1",
      id: simpul.getAttribute("data-id") ?? "",
    }
  }

  function tekan(event: AcaraPenunjuk<SVGSVGElement>) {
    if (event.button !== 0 || gestur.current) return
    const target = baca(event.target)
    if (target?.aksi === "hapus") return
    const awal = { id: event.pointerId, x: event.clientX, y: event.clientY, kx: event.clientX, ky: event.clientY, sudut, mode: "tunggu" as const, batal: false }
    gestur.current = target?.aksi === "dus" ? { ...awal, dusId: target.id, baris: target.baris, kolom: target.kolom, tingkat: target.tingkat } : awal
    if (target?.aksi !== "dus") return
    const pointerId = event.pointerId
    timer.current = window.setTimeout(() => {
      const g = gestur.current
      const svg = svgRef.current
      if (!g || g.mode !== "tunggu" || !g.dusId || !svg || g.id !== pointerId) return
      g.mode = "urut"
      const lokal = titikSvg(svg, g.kx, g.ky)
      const pusat = keLayar(g.kolom ?? 0, g.baris ?? 0, g.tingkat ?? 0, sudutRef.current)
      const tubuh = { x: pusat.x, y: pusat.y + TINGGI / 2 }
      setTahan(null)
      const berikut = { id: g.dusId, barisAsal: g.baris ?? 0, kolomAsal: g.kolom ?? 0, tingkat: g.tingkat ?? 0, x: lokal.x, y: lokal.y, ox: lokal.x - tubuh.x, oy: lokal.y - tubuh.y, sasaran: null }
      seretRef.current = berikut
      setSeret(berikut)
      try {
        svg.setPointerCapture(pointerId)
      } catch {
        // Penunjuk sintetis tidak bisa ditangkap; geser tetap mengikuti acara.
      }
      navigator.vibrate?.(12)
    }, 500)
    setTahan(target.id)
  }

  function gerak(event: AcaraPenunjuk<SVGSVGElement>) {
    const g = gestur.current
    if (!g || event.pointerId !== g.id) return
    g.kx = event.clientX
    g.ky = event.clientY
    if (g.mode === "urut") {
      event.preventDefault()
      geserUrut(event.currentTarget, event.clientX, event.clientY)
      return
    }
    const dx = event.clientX - g.x
    const dy = event.clientY - g.y
    if (g.mode === "tunggu" && Math.hypot(dx, dy) > 10) {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = null
      setTahan(null)
      g.batal = true
      if (Math.abs(dx) >= 8 && Math.abs(dx) > Math.abs(dy)) {
        g.mode = "putar"
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // Penunjuk sintetis tidak bisa ditangkap.
        }
      }
    }
    if (g.mode === "putar") {
      event.preventDefault()
      setSudut(g.sudut - (dx * Math.PI) / 180)
    }
  }

  function geserUrut(svg: SVGSVGElement, clientX: number, clientY: number) {
    const g = gestur.current
    const awal = seretRef.current
    if (!g?.dusId || !awal) return
    let sekarang = awal
    const lokal = titikSvg(svg, clientX, clientY)
    const data = gridRef.current
    const sudutAktif = sudutRef.current
    const tumpukan = data[sekarang.barisAsal]?.[sekarang.kolomAsal] ?? []
    const pusatX = keLayar(sekarang.kolomAsal, sekarang.barisAsal, 0, sudutAktif).x
    let sasaran: Sasaran | null = null
    let jarakPetak = Infinity
    let petakDekat: Sasaran | null = null
    for (const item of petak(data)) {
      if (item.macam === "isi") continue
      const pusat = keLayar(item.kolom, item.baris, 0, sudutAktif)
      const jarak = Math.hypot(lokal.x - pusat.x, lokal.y - (pusat.y + TINGGI))
      if (jarak < jarakPetak) {
        jarakPetak = jarak
        petakDekat = { baris: item.baris, kolom: item.kolom }
      }
    }
    if (Math.abs(lokal.x - pusatX) >= 36 && petakDekat && jarakPetak < 40) {
      sasaran = petakDekat
    } else {
      const visual = tumpukan
        .map((id, tingkat) => ({ id, y: keLayar(sekarang.kolomAsal, sekarang.barisAsal, tingkat, sudutAktif).y + TINGGI / 2 }))
        .sort((a, b) => a.y - b.y)
      let keAtas = visual.length - 1
      for (let i = 0; i < visual.length; i += 1) {
        if (lokal.y < visual[i].y) {
          keAtas = i
          break
        }
      }
      const dariAtas = [...tumpukan].reverse().indexOf(g.dusId)
      if (dariAtas >= 0 && dariAtas !== keAtas) {
        const urutanBaru = susunUlang(tumpukan, dariAtas, keAtas)
        if (urutanBaru.join() !== tumpukan.join()) {
          sekarang = { ...sekarang, tingkat: urutanBaru.indexOf(g.dusId) }
          onUrutRef.current(sekarang.barisAsal, sekarang.kolomAsal, urutanBaru)
        }
      }
    }
    const berikut = { ...sekarang, x: lokal.x, y: lokal.y, sasaran }
    seretRef.current = berikut
    setSeret(berikut)
  }

  function lepas(event: AcaraPenunjuk<SVGSVGElement>) {
    const g = gestur.current
    if (!g || event.pointerId !== g.id) return
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    const mode = g.mode
    const batal = g.batal
    const dusId = g.dusId
    gestur.current = null
    setTahan(null)
    if (mode === "urut") {
      const akhir = seretRef.current
      const asal = akhir ? cariDus(gridRef.current, akhir.id) : null
      if (akhir && asal) {
        const pusat = keLayar(asal.kolom, asal.baris, asal.tingkat, sudutRef.current)
        const ofs = { id: akhir.id, dx: akhir.x - akhir.ox - pusat.x, dy: akhir.y - akhir.oy - (pusat.y + TINGGI / 2) }
        if (akhir.sasaran) pegangan.current = ofs
        else setMendarat({ ...ofs, lembut: true })
      }
      if (akhir?.sasaran && asal) onPindahRef.current(asal, akhir.sasaran.baris, akhir.sasaran.kolom)
      else if (akhir) onPilihDus({ baris: akhir.barisAsal, kolom: akhir.kolomAsal, tingkat: akhir.tingkat })
      seretRef.current = null
      setSeret(null)
      return
    }
    if (mode === "putar" || batal) return
    const target = baca(event.target)
    if (target?.aksi === "dus" && dusId) {
      const sama = aktif?.baris === target.baris && aktif.kolom === target.kolom && aktif.tingkat === target.tingkat
      if (sama) onLepasPilih()
      else onPilihDus({ baris: target.baris, kolom: target.kolom, tingkat: target.tingkat })
      return
    }
    if (target?.aksi === "kosong") {
      onKosong(target.baris, target.kolom, target.atas)
      return
    }
    onLepasPilih()
  }

  return (
    <svg
      ref={svgRef}
      width={lebar}
      height={tinggiGambar}
      viewBox={`${minX - PINGGIR} ${minY - PINGGIR} ${lebar} ${tinggiGambar}`}
      role="group"
      aria-label="Balok susunan. Geser mendatar untuk memutar. Tahan dus untuk mengurutkan."
      className="block shrink-0 touch-none select-none"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={tekan}
      onPointerMove={gerak}
      onPointerUp={lepas}
      onPointerCancel={lepas}
    >
      {urutan.map((item, indeks) => {
        const tumpukan = grid[item.baris]?.[item.kolom] ?? []
        const pudar = Boolean(fokus && item.macam === "isi" && (fokus.baris !== item.baris || fokus.kolom !== item.kolom))
        return (
          <g key={`${item.macam}-${item.baris}-${item.kolom}`} opacity={pudar ? 0.24 : 1}>
            {indeks === indeksDepan ? tulisanDepan : null}
            {item.macam !== "isi" && (
              <PetakKosong baris={item.baris} kolom={item.kolom} tingkat={0} atas={false} sudut={sudut} macam={item.macam} onPilih={() => onKosong(item.baris, item.kolom, false)} />
            )}
            {tumpukan.map((id, tingkat) => {
              const titik = pojok(item.kolom, item.baris, tingkat, sudut)
              const nama = kode.get(id) ?? ""
              const dipilih = aktif?.baris === item.baris && aktif.kolom === item.kolom && aktif.tingkat === tingkat
              const ditarik = seret?.id === id
              const tulisan = letakTulisan(titik, sudut)
              const azKotak = keLayar(item.kolom, item.baris, 0, sudut).az
              const terhalang = penghalang.some((lain) => lain.az > azKotak + 0.02 && lain.muka.some((sudutMuka) => diDalam(tulisan, sudutMuka)))
              const tampilLabel = !ditarik && !terhalang && !(fokus && (fokus.baris !== item.baris || fokus.kolom !== item.kolom))
              const gerakDus = ditarik ? null : mendarat?.id === id ? mendarat : geser.get(id) ?? null
              return (
                <g key={id} data-aksi="dus" data-id={id} data-baris={item.baris} data-kolom={item.kolom} data-tingkat={tingkat} role="button" tabIndex={0} aria-label={`${nama}, baris ${item.baris + 1}, kolom ${item.kolom + 1}`} className="cursor-pointer" onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onPilihDus({ baris: item.baris, kolom: item.kolom, tingkat })
                  }
                }}>
                  <GerakDus masuk={!ditarik && masuk.has(id)} geser={gerakDus}>
                    {ditarik ? (
                      <polygon points={rangkaian(titik)} fill="rgba(238,77,45,0.08)" stroke="#EE4D2D" strokeDasharray="3 3" />
                    ) : (
                      <BadanDus titik={titik} sudut={sudut} dipilih={dipilih || tahan === id} tepi={dipilih ? "#EE4D2D" : "#3a2a1c"} />
                    )}
                    {tampilLabel && <TulisanDus x={tulisan.x} y={tulisan.y} nama={nama} muka={tulisan.muka} id={id} />}
                  </GerakDus>
                </g>
              )
            })}
            {item.macam === "isi" && (
              <PetakKosong baris={item.baris} kolom={item.kolom} tingkat={tumpukan.length} atas sudut={sudut} macam="halo" onPilih={() => onKosong(item.baris, item.kolom, true)} />
            )}
          </g>
        )
      })}
      {indeksDepan === -1 ? tulisanDepan : null}
      {pergi.map((hantu) => {
        const titik = pojok(hantu.kolom, hantu.baris, hantu.tingkat, sudut)
        const tulisan = letakTulisan(titik, sudut)
        return (
          <g key={hantu.kunci} className="dus-angkat" pointerEvents="none">
            <BadanDus titik={titik} sudut={sudut} dipilih={false} tepi="#3a2a1c" />
            <TulisanDus x={tulisan.x} y={tulisan.y} nama={hantu.nama} muka={tulisan.muka} id={`pergi-${hantu.kunci}`} />
          </g>
        )
      })}
      {aktif && !seret && mendarat?.id !== grid[aktif.baris]?.[aktif.kolom]?.[aktif.tingkat] && (() => {
        const titik = pojok(aktif.kolom, aktif.baris, aktif.tingkat, sudut)
        const atas = titik.reduce((jumlah, item) => jumlah + item.y, 0) / titik.length
        const x = Math.min(...titik.map((item) => item.x)) - 16
        const y = atas + TINGGI / 2
        const nama = kode.get(grid[aktif.baris]?.[aktif.kolom]?.[aktif.tingkat] ?? "") ?? "dus"
        return (
          <g data-aksi="hapus" role="button" tabIndex={0} aria-label={`Hapus ${nama}`} className="cursor-pointer" onPointerDown={(event) => event.stopPropagation()} onClick={() => onHapus(aktif)} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              onHapus(aktif)
            }
          }}>
            <circle cx={x} cy={y} r={12} fill="#241410" stroke="#EE4D2D" strokeWidth={1.5} />
            <path d="M-5-3.2H5M-2-3.2V-5.2H2V-3.2M-4-2.2H4L3.2 5H-3.2Z" transform={`translate(${x} ${y})`} fill="none" stroke="#EE4D2D" strokeWidth={1.4} strokeLinejoin="round" pointerEvents="none" />
          </g>
        )
      })()}
      {seret && lokasiSeret && (() => {
        const titik = pojok(lokasiSeret.kolom, lokasiSeret.baris, lokasiSeret.tingkat, sudut)
        const tubuh = keLayar(lokasiSeret.kolom, lokasiSeret.baris, lokasiSeret.tingkat, sudut)
        const dx = seret.x - seret.ox - tubuh.x
        const dy = seret.y - seret.oy - (tubuh.y + TINGGI / 2)
        const tulisan = letakTulisan(titik, sudut)
        const nama = kode.get(seret.id) ?? ""
        return (
          <g transform={`translate(${dx} ${dy})`} pointerEvents="none">
            <BadanDus titik={titik} sudut={sudut} dipilih tepi="#EE4D2D" />
            <TulisanDus x={tulisan.x} y={tulisan.y} nama={nama} muka={tulisan.muka} id={seret.id} />
          </g>
        )
      })()}
    </svg>
  )
}

function cariDus(grid: string[][][], id: string): Posisi | null {
  for (let baris = 0; baris < grid.length; baris += 1) {
    for (let kolom = 0; kolom < grid[baris].length; kolom += 1) {
      const tingkat = grid[baris][kolom].indexOf(id)
      if (tingkat >= 0) return { baris, kolom, tingkat }
    }
  }
  return null
}

function PetakKosong({
  baris,
  kolom,
  tingkat,
  atas,
  sudut,
  macam,
  onPilih,
}: {
  baris: number
  kolom: number
  tingkat: number
  atas: boolean
  sudut: number
  macam: "parkir" | "halo"
  onPilih: () => void
}) {
  const mentah = pojok(kolom, baris, tingkat, sudut)
  const titik = atas ? mentah : mentah.map((item) => ({ x: item.x, y: item.y + TINGGI }))
  const pusatMentah = keLayar(kolom, baris, tingkat, sudut)
  const pusat = atas ? pusatMentah : { ...pusatMentah, y: pusatMentah.y + TINGGI }
  const label = atas ? `Tambah di atas baris ${baris + 1} kolom ${kolom + 1}` : macam === "parkir" ? `Parkir baris ${baris + 1} kolom ${kolom + 1}` : `Petak kosong baris ${baris + 1} kolom ${kolom + 1}`
  return (
    <g
      data-aksi="kosong"
      data-baris={baris}
      data-kolom={kolom}
      data-atas={atas ? "1" : "0"}
      role="button"
      tabIndex={0}
      aria-label={label}
      className="cursor-pointer"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onPilih()
        }
      }}
    >
      <polygon points={rangkaian(titik)} fill={macam === "parkir" ? "rgba(238,77,45,0.08)" : "rgba(255,255,255,0.03)"} stroke={macam === "parkir" ? "rgba(238,77,45,0.85)" : "rgba(255,255,255,0.28)"} strokeDasharray="3 3" strokeWidth={macam === "parkir" ? 1.5 : 1} />
      {macam === "parkir" ? (
        <text x={pusat.x} y={pusat.y + 1} textAnchor="middle" dominantBaseline="middle" fill="#f0b2a4" fontSize={8} fontWeight={700} fontFamily="Manrope, sans-serif" pointerEvents="none">
          parkir
        </text>
      ) : (
        <>
          <line x1={pusat.x - 6} y1={pusat.y} x2={pusat.x + 6} y2={pusat.y} stroke="#c5cec6" strokeWidth={1.5} pointerEvents="none" />
          <line x1={pusat.x} y1={pusat.y - 6} x2={pusat.x} y2={pusat.y + 6} stroke="#c5cec6" strokeWidth={1.5} pointerEvents="none" />
        </>
      )}
    </g>
  )
}
