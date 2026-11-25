import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "./components/AppShell"
import { BingkaiAkun } from "./components/BingkaiAkun"
import { BarangDetail } from "./pages/BarangDetail"
import { BarangForm } from "./pages/BarangForm"
import { BarangList } from "./pages/BarangList"
import { DusDetail } from "./pages/DusDetail"
import { DusForm } from "./pages/DusForm"
import { DusList } from "./pages/DusList"
import { HalamanDitolak, HalamanMasuk } from "./pages/Masuk"
import { Pindah } from "./pages/Pindah"
import { HalamanProfil } from "./pages/Profil"
import { RiwayatPage } from "./pages/Riwayat"
import { LinkButton, Loading, PageHeader } from "./components/ui"
import { useSesi } from "./lib/sesi"

export default function App() {
  const sesi = useSesi()

  if (sesi.status === "memuat" || sesi.status === "memeriksa") {
    return (
      <BingkaiAkun>
        <Loading letak="baris" label={sesi.status === "memeriksa" ? "Memeriksa akun..." : "Membuka sesi..."} />
      </BingkaiAkun>
    )
  }

  if (sesi.status === "tamu") {
    return (
      <Routes>
        <Route path="/masuk" element={<HalamanMasuk />} />
        <Route path="*" element={<Navigate to="/masuk" replace />} />
      </Routes>
    )
  }

  if (sesi.status === "ditolak") {
    return <HalamanDitolak />
  }

  return (
    <Routes>
      <Route path="/masuk" element={<Navigate to="/dus" replace />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dus" replace />} />
        <Route path="dus" element={<DusList />} />
        <Route path="dus/baru" element={<DusForm />} />
        <Route path="dus/:id" element={<DusDetail />} />
        <Route path="dus/:id/edit" element={<DusForm />} />
        <Route path="dus/:id/pindah" element={<Pindah />} />
        <Route path="barang" element={<BarangList />} />
        <Route path="barang/baru" element={<BarangForm />} />
        <Route path="barang/:id" element={<BarangDetail />} />
        <Route path="barang/:id/edit" element={<BarangForm />} />
        <Route path="riwayat" element={<RiwayatPage />} />
        <Route path="profil" element={<HalamanProfil />} />
        <Route
          path="*"
          element={
            <div>
              <PageHeader title="Halaman tidak ada" subtitle="Alamat ini tidak dikenali." />
              <LinkButton to="/dus" variant="ghost">Ke daftar dus</LinkButton>
            </div>
          }
        />
      </Route>
    </Routes>
  )
}
