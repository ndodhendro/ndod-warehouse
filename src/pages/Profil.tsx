import { useState } from "react"
import { LogOut, UserRound } from "lucide-react"
import { Button, Card, PageHeader, useConfirm } from "../components/ui"
import { useSesi } from "../lib/sesi"

function inisialAkun(nama: string | null, email: string | null) {
  const sumber = (nama || email || "?").trim()
  const bagian = sumber.split(/\s+/).filter(Boolean)
  if (bagian.length >= 2) return (bagian[0][0] + bagian[1][0]).toUpperCase()
  return sumber.slice(0, 2).toUpperCase()
}

export function HalamanProfil() {
  const { email, nama, keluar } = useSesi()
  const confirm = useConfirm()
  const [sibuk, setSibuk] = useState(false)
  const judul = nama || email || "Akun"

  async function klikKeluar() {
    const ya = await confirm({
      title: "Keluar dari akun?",
      body: "Sesi di perangkat ini dihapus. Perubahan berikutnya tercatat setelah masuk lagi.",
      confirmLabel: "Keluar",
      danger: true,
    })
    if (!ya) return
    setSibuk(true)
    try {
      await keluar()
    } catch {
      setSibuk(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader icon={UserRound} title="Profil" subtitle="" />
      <Card className="max-w-lg p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-amber-500/15 text-lg font-semibold text-amber-300">
            {inisialAkun(nama, email)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{judul}</p>
            {nama && email && <p className="mt-0.5 truncate text-sm text-mist-300">{email}</p>}
          </div>
        </div>
        <Button type="button" variant="danger" className="mt-5 w-full sm:w-auto" disabled={sibuk} onClick={() => void klikKeluar()}>
          <LogOut size={16} />
          {sibuk ? "Keluar..." : "Keluar"}
        </Button>
      </Card>
      <p className="mt-auto pt-8 text-center text-xs tabular-nums text-mist-500">Versi {__APP_VERSION__}</p>
    </div>
  )
}
