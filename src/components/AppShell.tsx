import { NavLink, Outlet } from "react-router-dom"
import { useEffect, useState } from "react"
import { Box, Package, ScrollText } from "lucide-react"
import { DialogPembaruan, usePembaruanAplikasi } from "./PembaruanAplikasi"
import { cn } from "./ui"

const menu = [
  { to: "/dus", label: "Dus", icon: Box, end: false },
  { to: "/barang", label: "Barang", icon: Package, end: false },
  { to: "/riwayat", label: "Riwayat", icon: ScrollText, end: false },
]

function tautanClass(active: boolean) {
  return cn(
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
    active ? "bg-amber-500/15 text-amber-300" : "text-mist-300 hover:bg-white/5",
  )
}

export function AppShell() {
  const pembaruan = usePembaruanAplikasi()
  const perbarui = pembaruan.tampilkanTombol ? pembaruan.perbarui : undefined

  return (
    <div className="min-h-dvh bg-ink-950 text-mist-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_420px_at_0%_-10%,rgba(227,155,43,0.16),transparent_55%),radial-gradient(700px_380px_at_100%_0%,rgba(46,174,147,0.1),transparent_50%)]" />
      <div className="relative mx-auto grid min-h-dvh max-w-6xl md:grid-cols-[232px_minmax(0,1fr)]">
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
          <footer className="space-y-2 px-1">
            <p className="text-xs leading-relaxed text-mist-500">Stok tas, botol minum, dan kotak makan, dicatat per dus.</p>
            <VersiAplikasi onPerbarui={perbarui} />
          </footer>
        </aside>
        <div className="min-w-0">
          <OfflineBanner />
          <main className="px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] md:px-8 md:pb-12 md:pt-8">
            <Outlet />
          </main>
        </div>
      </div>
      <MobileNav onPerbarui={perbarui} />
      {pembaruan.dialogTerbuka && (
        <DialogPembaruan memuat={pembaruan.memuat} onNanti={pembaruan.nanti} onPerbarui={pembaruan.perbarui} />
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
        <span className="block text-xs text-mist-500">Tas, botol & kotak</span>
      </span>
    </div>
  )
}

function VersiAplikasi({ className, onPerbarui }: { className?: string; onPerbarui?: () => void }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <p className="text-[11px] tabular-nums text-mist-500">Versi {__APP_VERSION__}</p>
      {onPerbarui && (
        <button
          type="button"
          onClick={onPerbarui}
          className="perbarui-glow rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold leading-none text-ink-950"
        >
          Perbarui sekarang
        </button>
      )}
    </div>
  )
}

function MobileNav({ onPerbarui }: { onPerbarui?: () => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-950/90 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigasi utama"
    >
      <VersiAplikasi onPerbarui={onPerbarui} className="justify-center pt-1.5" />
      <div className="mx-auto grid max-w-lg grid-cols-3 px-2">
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
