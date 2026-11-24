import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null

export function supabaseConfigured() {
  return supabase !== null
}

function db() {
  if (!supabase) throw new Error("Supabase belum diatur. Isi file .env lalu jalankan ulang aplikasi.")
  return supabase
}

export { db }
