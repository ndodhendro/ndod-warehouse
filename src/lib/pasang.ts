import { useEffect, useState } from "react"

interface PeristiwaPasang extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let peristiwa: PeristiwaPasang | null = null

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    peristiwa = event as PeristiwaPasang
    window.dispatchEvent(new Event("pasang-siap"))
  })
}

function sedangTerpasang() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function perangkatIos() {
  const ua = navigator.userAgent
  const iPhone = /iphone|ipad|ipod/i.test(ua)
  const iPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
  return iPhone || iPad
}

export function usePasangAplikasi() {
  const [siap, setSiap] = useState(false)
  const [ios, setIos] = useState(false)
  const [terpasang, setTerpasang] = useState(false)
  const [petunjuk, setPetunjuk] = useState(false)

  useEffect(() => {
    setTerpasang(sedangTerpasang())
    setIos(perangkatIos())
    setSiap(peristiwa !== null)

    const onSiap = () => setSiap(true)
    const onTerpasang = () => {
      peristiwa = null
      setSiap(false)
      setTerpasang(true)
      setPetunjuk(false)
    }
    window.addEventListener("pasang-siap", onSiap)
    window.addEventListener("appinstalled", onTerpasang)
    return () => {
      window.removeEventListener("pasang-siap", onSiap)
      window.removeEventListener("appinstalled", onTerpasang)
    }
  }, [])

  const pasang = async () => {
    if (!peristiwa) {
      setPetunjuk(true)
      return
    }
    const kejadian = peristiwa
    try {
      await kejadian.prompt()
      peristiwa = null
      setSiap(false)
      const pilihan = await kejadian.userChoice
      if (pilihan.outcome === "accepted") setTerpasang(true)
    } catch {
      peristiwa = kejadian
      setSiap(true)
    }
  }

  return {
    tampilkan: !terpasang && (siap || ios),
    petunjuk,
    pasang,
    tutupPetunjuk: () => setPetunjuk(false),
  }
}
