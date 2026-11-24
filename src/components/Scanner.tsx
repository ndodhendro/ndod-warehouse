import { useEffect, useRef, useState } from "react"
import { pesanError } from "../lib/errors"

function pesanKamera(err: unknown) {
  const name = err instanceof DOMException ? err.name : ""
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Izin kamera ditolak. Izinkan kamera untuk memindai kode."
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Kamera tidak ditemukan di perangkat ini."
  }
  if (!window.isSecureContext) {
    return "Kamera hanya bisa dipakai lewat HTTPS atau localhost."
  }
  return pesanError(err)
}

export function Scanner({ onResult }: { onResult: (kode: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!window.isSecureContext) {
      setGalat("Kamera hanya bisa dipakai lewat HTTPS atau localhost.")
      return
    }

    let berhenti = false
    let controls: { stop: () => void } | undefined

    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser")
        const reader = new BrowserMultiFormatReader()
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          video,
          (result) => {
            if (berhenti || !result) return
            berhenti = true
            const teks = result.getText().trim()
            controls?.stop()
            if (teks) onResultRef.current(teks)
          },
        )
        if (berhenti) controls.stop()
      } catch (err) {
        if (!berhenti) setGalat(pesanKamera(err))
      }
    })()

    return () => {
      berhenti = true
      controls?.stop()
      const stream = video.srcObject
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black">
        <video ref={videoRef} className="aspect-[3/4] w-full object-cover sm:aspect-video" muted playsInline autoPlay />
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-amber-300/80" />
      </div>
      {galat && <p className="mt-3 text-sm text-clay-400">{galat}</p>}
    </div>
  )
}
