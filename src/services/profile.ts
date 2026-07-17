import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/** Perfil del usuario autenticado actual (null si no hay sesión). */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return data ?? null;
}
