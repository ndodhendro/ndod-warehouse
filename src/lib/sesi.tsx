import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { Session, User } from "@supabase/supabase-js"
import { pesanError } from "./errors"
import { supabase } from "./supabase"

export type StatusSesi = "memuat" | "memeriksa" | "tamu" | "masuk" | "ditolak"

type Akun = {
  email: string
  nama: string
}

type NilaiSesi = {
  status: StatusSesi
  email: string | null
  nama: string | null
  pesan: string | null
  keluar: () => Promise<void>
}

const SesiContext = createContext<NilaiSesi | null>(null)

function akunDariUser(user: User | null | undefined): Akun | null {
  if (!user) return null
  const meta = user.user_metadata ?? {}
  const namaMeta = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : ""
  const emailMeta = typeof meta.email === "string" ? meta.email : ""
  const email = (user.email || emailMeta).trim()
  if (!email) return null
  return { email, nama: namaMeta.trim() }
}

export function alamatBalikOAuth() {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)
  return url.origin + url.pathname.replace(/\/$/, "")
}

export function SesiProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [siap, setSiap] = useState(false)
  const [sesi, setSesi] = useState<Session | null>(null)
  const [izin, setIzin] = useState<boolean | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setSiap(true)
      return
    }

    let hidup = true
    supabase.auth.getSession().then(({ data }) => {
      if (!hidup) return
      setSesi(data.session)
      setSiap(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesi(session)
      setSiap(true)
    })
    return () => {
      hidup = false
      data.subscription.unsubscribe()
    }
  }, [])

  const userId = sesi?.user.id ?? null

  useEffect(() => {
    if (!siap || !supabase || !userId) {
      setIzin(null)
      setPesan(null)
      return
    }

    let batal = false
    setIzin(null)
    setPesan(null)
    supabase.rpc("boleh_masuk").then(({ data, error }) => {
      if (batal) return
      if (error) {
        setPesan(pesanError(error))
        setIzin(false)
        return
      }
      setIzin(data === true)
    })
    return () => {
      batal = true
    }
  }, [siap, userId])

  const akun = akunDariUser(sesi?.user)
  const status: StatusSesi = !siap ? "memuat" : !sesi ? "tamu" : izin === null ? "memeriksa" : izin ? "masuk" : "ditolak"

  const nilai = useMemo<NilaiSesi>(() => {
    return {
      status,
      email: akun?.email ?? null,
      nama: akun?.nama || null,
      pesan,
      keluar: async () => {
        queryClient.clear()
        if (supabase) await supabase.auth.signOut({ scope: "local" })
      },
    }
  }, [akun?.email, akun?.nama, pesan, queryClient, status])

  return <SesiContext.Provider value={nilai}>{children}</SesiContext.Provider>
}

export function useSesi() {
  const nilai = useContext(SesiContext)
  if (!nilai) throw new Error("useSesi dipakai di luar SesiProvider.")
  return nilai
}
