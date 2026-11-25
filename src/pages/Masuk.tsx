import { useEffect, useRef, useState } from "react"
import { LogOut } from "lucide-react"
import { BingkaiAkun } from "../components/BingkaiAkun"
import { SetupCard } from "../components/SetupCard"
import { Button, Card } from "../components/ui"
import { pesanError } from "../lib/errors"
import { alamatBalikOAuth, useSesi } from "../lib/sesi"
import { supabase, supabaseConfigured } from "../lib/supabase"

export function HalamanMasuk() {
  const siap = supabaseConfigured()
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const tungguPindah = useRef<ReturnType<typeof window.setTimeout> | undefined>(undefined)

  useEffect(() => {
    let sempatSembunyi = false
    function pulihkan() {
      window.clearTimeout(tungguPindah.current)
      sempatSembunyi = false
      setSibuk(false)
    }
    function saatKembali(event: PageTransitionEvent) {
      if (event.persisted) pulihkan()
    }
    function saatTerlihat() {
      if (document.visibilityState === "hidden") sempatSembunyi = true
      if (document.visibilityState === "visible" && sempatSembunyi) pulihkan()
    }
    window.addEventListener("pageshow", saatKembali)
    document.addEventListener("visibilitychange", saatTerlihat)
    return () => {
      window.removeEventListener("pageshow", saatKembali)
      document.removeEventListener("visibilitychange", saatTerlihat)
      window.clearTimeout(tungguPindah.current)
    }
  }, [])

  async function masuk() {
    if (!supabase) return
    setGalat(null)
    setSibuk(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: alamatBalikOAuth(),
          queryParams: { prompt: "select_account" },
        },
      })
      if (error) {
        setSibuk(false)
        setGalat(/provider/i.test(error.message) ? "Login Google belum diaktifkan di Supabase." : pesanError(error))
        return
      }
    } catch (error) {
      setSibuk(false)
      setGalat(pesanError(error))
      return
    }
    window.clearTimeout(tungguPindah.current)
    tungguPindah.current = window.setTimeout(() => {
      if (document.visibilityState === "visible") setSibuk(false)
    }, 2000)
  }

  return (
    <BingkaiAkun>
      <div className="mb-6 flex flex-col items-center gap-1 text-center">
        <img src={`${import.meta.env.BASE_URL}pwa-192.png`} alt="" width={56} height={56} className="h-14 w-14 rounded-2xl" />
        <h1 className="text-lg font-semibold">Ndod Warehouse</h1>
        <p className="text-xs tabular-nums text-mist-500">Versi {__APP_VERSION__}</p>
      </div>
      {siap ? (
        <Card className="p-5">
          <Button type="button" className="w-full !bg-teal-500 hover:!bg-teal-400" disabled={sibuk} onClick={masuk}>
            <LogoGoogle />
            {sibuk ? "Membuka Google..." : "Masuk dengan Google"}
          </Button>
          {galat && <p className="mt-3 text-sm text-clay-400">{galat}</p>}
        </Card>
      ) : (
        <SetupCard />
      )}
    </BingkaiAkun>
  )
}

export function HalamanDitolak() {
  const { email, pesan, keluar } = useSesi()
  const [sibuk, setSibuk] = useState(false)

  return (
    <BingkaiAkun>
      <Card className="p-5">
        <h1 className="text-xl font-semibold">{pesan ? "Belum bisa membuka gudang" : "Akun belum bisa masuk"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-mist-300">
          {pesan ?? `${email ?? "Akun ini"} belum ada di daftar pengguna gudang. Minta pengelola menambahkan emailnya, lalu masuk lagi.`}
        </p>
        <div className="mt-5 flex gap-2">
          <Button type="button" variant="ghost" className="min-w-0 flex-1" onClick={() => window.location.reload()}>
            Muat ulang
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-w-0 flex-1"
            disabled={sibuk}
            onClick={() => {
              setSibuk(true)
              void keluar().catch(() => setSibuk(false))
            }}
          >
            <LogOut size={16} />
            {sibuk ? "Keluar..." : "Keluar"}
          </Button>
        </div>
      </Card>
    </BingkaiAkun>
  )
}

function LogoGoogle() {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white">
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l.1.1 6.3 5.3C36.9 41.6 44 36 44 24c0-1.2-.1-2.3-.4-3.5z" />
      </svg>
    </span>
  )
}
