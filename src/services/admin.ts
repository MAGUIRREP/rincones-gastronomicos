import { createClient } from "@/lib/supabase/server";
import type { AuditLogWithProfile, Profile } from "@/types/database";

/** Lista de todos los perfiles (RLS: solo visible para admin). */
export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at");
  if (error) throw new Error(`Error cargando usuarios: ${error.message}`);
  return data ?? [];
}

/** Últimas entradas de auditoría con el autor del cambio. */
export async function getAuditLog(limit = 100): Promise<AuditLogWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*, profile:profiles!audit_log_changed_by_fkey (email, full_name)")
    .order("changed_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Error cargando auditoría: ${error.message}`);
  return (data ?? []) as unknown as AuditLogWithProfile[];
}
