import { useEffect, useState } from "react"
import { Button, Card } from "./ui"

type PromptPasang = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

function perangkat() {
  const ua = navigator.userAgent
  const ios =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  return { ios, standalone }
}

export function InstallHint() {
  const [{ ios, standalone }] = useState(perangkat)
  const [prompt, setPrompt] = useState<PromptPasang | null>(null)
  const [tutup, setTutup] = useState(() => localStorage.getItem("gudang-install-tutup") === "1")

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as PromptPasang)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  if (standalone || tutup) return null

  const sembunyikan = () => {
    localStorage.setItem("gudang-install-tutup", "1")
    setTutup(true)
  }

  return (
    <Card className="mb-5 p-4">
      <p className="text-sm font-semibold">Pasang di layar utama</p>
      {prompt ? (
        <p className="mt-1 text-sm text-mist-300">Aplikasi bisa dibuka seperti aplikasi biasa, tanpa bilah browser.</p>
      ) : ios ? (
        <p className="mt-1 text-sm text-mist-300">
          Di iPhone atau iPad, buka menu Bagikan di Safari, lalu pilih Tambahkan ke Layar Utama.
        </p>
      ) : (
        <p className="mt-1 text-sm text-mist-300">
          Di Android, buka menu Chrome lalu pilih Pasang aplikasi atau Tambahkan ke layar utama. Alamatnya harus HTTPS.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {prompt && (
          <Button
            onClick={async () => {
              await prompt.prompt()
              await prompt.userChoice
              setPrompt(null)
            }}
          >
            Pasang aplikasi
          </Button>
        )}
        <Button variant="quiet" onClick={sembunyikan}>
          Nanti saja
        </Button>
      </div>
    </Card>
  )
}
