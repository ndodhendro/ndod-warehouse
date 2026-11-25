import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "./components/AppShell"
import { BarangDetail } from "./pages/BarangDetail"
import { BarangForm } from "./pages/BarangForm"
import { BarangList } from "./pages/BarangList"
import { DusDetail } from "./pages/DusDetail"
import { DusForm } from "./pages/DusForm"
import { DusList } from "./pages/DusList"
import { Pindah } from "./pages/Pindah"
import { RiwayatPage } from "./pages/Riwayat"
import { LinkButton, PageHeader } from "./components/ui"

export default function App() {
  return (
    <Routes>
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
