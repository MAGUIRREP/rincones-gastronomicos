import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la clave service_role.
 *
 * SOLO puede usarse en el servidor (el import de "server-only" rompe
 * la compilación si se importa desde el cliente). Se emplea para la
 * administración de usuarios (crear, bloquear, eliminar), que requiere
 * la API de administración de Auth.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
