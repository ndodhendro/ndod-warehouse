import { NavLink, Outlet, useLocation } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { Box, Download, Handbag, ScrollText, UserRound } from "lucide-react"
import { usePasangAplikasi } from "../lib/pasang"
import { DialogPembaruan, usePembaruanAplikasi } from "./PembaruanAplikasi"
import { Sheet, cn } from "./ui"

const menu = [
  { to: "/dus", label: "Dus", icon: Box, end: false },
  { to: "/barang", label: "Barang", icon: Handbag, end: false },
  { to: "/riwayat", label: "Riwayat", icon: ScrollText, end: false },
  { to: "/profil", label: "Profil", icon: UserRound, end: true },
]

function tautanClass(active: boolean) {
  return cn(
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
    active ? "bg-amber-500/15 text-amber-300" : "text-mist-300 hover:bg-white/5",
  )
}

export function AppShell() {
  const lokasi = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const pembaruan = usePembaruanAplikasi()
  const pasang = usePasangAplikasi()
  const perbarui = pembaruan.tampilkanTombol ? pembaruan.perbarui : undefined
  const pasangAplikasi = pasang.tampilkan ? pasang.pasang : undefined

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [lokasi.pathname])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ink-950 text-mist-100 md:block md:h-auto md:min-h-dvh md:overflow-visible">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_420px_at_0%_-10%,rgba(227,155,43,0.16),transparent_55%),radial-gradient(700px_380px_at_100%_0%,rgba(46,174,147,0.1),transparent_50%)]" />
      <div className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col md:grid md:min-h-dvh md:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-white/10 px-4 py-6 md:flex">
          <Merek />
          <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Navigasi utama">
            {menu.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => tautanClass(isActive)}>
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <footer className="space-y-3 px-1">
            <AksiAplikasi onPerbarui={perbarui} onPasang={pasangAplikasi} />
          </footer>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:min-h-dvh">
          <OfflineBanner />
          <main
            ref={mainRef}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] md:overflow-visible md:px-8 md:pb-8 md:pt-8"
          >
            <Outlet />
          </main>
        </div>
      </div>
      <MobileNav onPerbarui={perbarui} onPasang={pasangAplikasi} />
      {pembaruan.dialogTerbuka && (
        <DialogPembaruan memuat={pembaruan.memuat} onNanti={pembaruan.nanti} onPerbarui={pembaruan.perbarui} />
      )}
      {pasang.petunjuk && (
        <Sheet title="Install di iPhone" onClose={pasang.tutupPetunjuk}>
          <p className="text-sm text-mist-300">Di Safari, ketuk Bagikan, lalu pilih Tambahkan ke Layar Utama.</p>
        </Sheet>
      )}
    </div>
  )
}

function Merek() {
  return (
    <div className="flex items-center gap-3 px-1">
      <img src={`${import.meta.env.BASE_URL}pwa-192.png`} alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
      <span>
        <span className="block text-sm font-semibold">Ndod Warehouse</span>
      </span>
    </div>
  )
}

function AksiAplikasi({ onPerbarui, onPasang, className }: { onPerbarui?: () => void; onPasang?: () => void; className?: string }) {
  if (!onPerbarui && !onPasang) return null
  const berbagi = Boolean(onPerbarui && onPasang)
  return (
    <div className={cn("flex items-stretch justify-center gap-2", berbagi && "w-full", className)}>
      {onPerbarui && <TombolPerbarui onClick={onPerbarui} melebar={berbagi} />}
      {onPasang && <TombolPasang onClick={onPasang} melebar={berbagi} />}
    </div>
  )
}

function kelasAksi(melebar: boolean) {
  return cn(
    "inline-flex min-h-8 items-center justify-center gap-1 rounded-full bg-amber-500 px-3 text-center text-[11px] font-semibold leading-tight text-ink-950",
    melebar && "min-w-0 flex-1",
  )
}

function TombolPerbarui({ onClick, melebar }: { onClick: () => void; melebar: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn(kelasAksi(melebar), "perbarui-glow")}>
      Perbarui sekarang
    </button>
  )
}

function TombolPasang({ onClick, melebar }: { onClick: () => void; melebar: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn(kelasAksi(melebar), "shadow-[0_8px_20px_rgba(238,77,45,0.4)]")}>
      <Download size={13} />
      Install
    </button>
  )
}

function MobileNav({ onPerbarui, onPasang }: { onPerbarui?: () => void; onPasang?: () => void }) {
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const ukur = () => {
      const tinggi = Math.ceil(nav.getBoundingClientRect().height)
      if (tinggi > 0) document.documentElement.style.setProperty("--tinggi-nav-bawah", `${tinggi}px`)
    }
    ukur()
    const pengamat = new ResizeObserver(ukur)
    pengamat.observe(nav)
    return () => {
      pengamat.disconnect()
      document.documentElement.style.removeProperty("--tinggi-nav-bawah")
    }
  }, [])

  return (
    <nav
      ref={navRef}
      className="z-30 shrink-0 border-t border-white/10 bg-ink-950/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigasi utama"
    >
      <AksiAplikasi onPerbarui={onPerbarui} onPasang={onPasang} className="px-3 pb-1 pt-1.5" />
      <div className="mx-auto grid max-w-lg grid-cols-4 px-2">
        {menu.map((item) => (
          <ItemNav key={item.to} {...item} />
        ))}
      </div>
    </nav>
  )
}

function ItemNav({ to, label, icon: Icon, end }: (typeof menu)[number]) {
  return (
    <NavLink to={to} end={end} className="flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium">
      {({ isActive }) => (
        <>
          <Icon size={18} className={isActive ? "text-amber-300" : "text-mist-500"} />
          <span className={isActive ? "text-amber-300" : "text-mist-500"}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const hidup = () => setOnline(true)
    const mati = () => setOnline(false)
    window.addEventListener("online", hidup)
    window.addEventListener("offline", mati)
    return () => {
      window.removeEventListener("online", hidup)
      window.removeEventListener("offline", mati)
    }
  }, [])
  if (online) return null
  return (
    <div className="bg-clay-400 px-4 py-2 text-center text-sm font-medium text-ink-950">
      Tidak ada internet. Stok tidak bisa diperbarui.
    </div>
  )
}
