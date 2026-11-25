function sedangTerpasang() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

type OrientasiTerkunci = ScreenOrientation & {
  lock?: (orientasi: "portrait") => Promise<void>
}

async function kunciPortrait() {
  const orientasi = screen.orientation as OrientasiTerkunci | undefined
  if (!sedangTerpasang() || !orientasi?.lock) return
  try {
    await orientasi.lock("portrait")
  } catch {
    // Manifest tetap membatasi orientasi saat aplikasi terpasang.
  }
}

void kunciPortrait()
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void kunciPortrait()
})
