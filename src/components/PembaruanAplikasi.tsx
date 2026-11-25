import { useEffect, useRef, useState } from "react"
import { useRegisterSW } from "virtual:pwa-register/react"
import { Button } from "./ui"

const JEDA_CEK = 30 * 60 * 1000
const JEDA_MINIMUM = 60_000

export function usePembaruanAplikasi() {
  const swUrlRef = useRef("")
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const [dialogTerbuka, setDialogTerbuka] = useState(false)
  const [ditunda, setDitunda] = useState(false)
  const [memuat, setMemuat] = useState(false)
  const {
    needRefresh: [perluRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      swUrlRef.current = swUrl
      registrationRef.current = registration ?? null
    },
  })

  useEffect(() => {
    if (perluRefresh) setDialogTerbuka(true)
  }, [perluRefresh])

  useEffect(() => {
    let terakhir = 0
    const cek = async () => {
      const registration = registrationRef.current
      const swUrl = swUrlRef.current
      if (!registration || !swUrl || registration.installing || !navigator.onLine) return
      const sekarang = Date.now()
      if (sekarang - terakhir < JEDA_MINIMUM) return
      terakhir = sekarang
      try {
        const resp = await fetch(swUrl, {
          cache: "no-store",
          headers: { "cache-control": "no-cache" },
        })
        if (resp.ok) await registration.update()
      } catch {
        terakhir = 0
      }
    }
    const saatTerlihat = () => {
      if (document.visibilityState === "visible") void cek()
    }
    document.addEventListener("visibilitychange", saatTerlihat)
    const timer = window.setInterval(() => void cek(), JEDA_CEK)
    return () => {
      document.removeEventListener("visibilitychange", saatTerlihat)
      window.clearInterval(timer)
    }
  }, [])

  const perbarui = () => {
    if (memuat) return
    setMemuat(true)
    void updateServiceWorker(true)
  }

  const nanti = () => {
    setDialogTerbuka(false)
    setDitunda(true)
  }

  return {
    dialogTerbuka: perluRefresh && dialogTerbuka,
    tampilkanTombol: perluRefresh && ditunda && !dialogTerbuka,
    memuat,
    perbarui,
    nanti,
  }
}

export function DialogPembaruan({
  memuat,
  onNanti,
  onPerbarui,
}: {
  memuat: boolean
  onNanti: () => void
  onPerbarui: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !memuat) onNanti()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [memuat, onNanti])

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/60 p-4 sm:place-items-center">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-ink-900 p-5 shadow-card" role="alertdialog" aria-modal="true" aria-labelledby="judul-pembaruan">
        <h2 id="judul-pembaruan" className="text-lg font-semibold">Ada versi baru</h2>
        <p className="mt-2 text-sm text-mist-300">
          Pembaruan sudah siap. Perbarui sekarang akan memuat ulang halaman, jadi isian yang belum disimpan akan hilang. Pilih nanti kalau kamu masih mengisi data.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onNanti} disabled={memuat} autoFocus>
            Nanti
          </Button>
          <Button onClick={onPerbarui} disabled={memuat}>
            {memuat ? "Memuat ulang…" : "Perbarui sekarang"}
          </Button>
        </div>
      </div>
    </div>
  )
}
