import { useQuery } from "@tanstack/react-query"
import { getBarang, getDus, listBarang, listDus, listIsiDus, listRiwayat, listSebaran } from "./api"
import { supabaseConfigured } from "./supabase"

const siap = supabaseConfigured()

export function useDusList() {
  return useQuery({ queryKey: ["dus"], queryFn: listDus, enabled: siap })
}

export function useDus(id: string | undefined) {
  return useQuery({
    queryKey: ["dus", id],
    queryFn: () => getDus(id!),
    enabled: siap && Boolean(id),
  })
}

export function useIsiDus(id: string | undefined) {
  return useQuery({
    queryKey: ["dus", id, "isi"],
    queryFn: () => listIsiDus(id!),
    enabled: siap && Boolean(id),
    refetchOnWindowFocus: false,
  })
}

export function useBarangList() {
  return useQuery({ queryKey: ["barang"], queryFn: listBarang, enabled: siap })
}

export function useBarang(id: string | undefined) {
  return useQuery({
    queryKey: ["barang", id],
    queryFn: () => getBarang(id!),
    enabled: siap && Boolean(id),
  })
}

export function useSebaran(id: string | undefined) {
  return useQuery({
    queryKey: ["barang", id, "sebaran"],
    queryFn: () => listSebaran(id!),
    enabled: siap && Boolean(id),
  })
}

export function useRiwayat() {
  return useQuery({ queryKey: ["riwayat"], queryFn: listRiwayat, enabled: siap })
}
