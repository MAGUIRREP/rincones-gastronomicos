"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { loginSchema } from "@/lib/validations/auth";

export interface LoginState {
  error: string | null;
}

/**
 * Inicia sesión con email y contraseña.
 * Validación Zod + rate limiting por IP + verificación Turnstile,
 * todo en servidor. En caso de éxito redirige a redirectTo (si es
 * una ruta interna) o a la página principal.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    turnstileToken: formData.get("turnstileToken"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "unknown";

  // Máximo 10 intentos de login por IP cada 10 minutos.
  const { success } = rateLimit(`login:${ip}`, {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!success) {
    return {
      error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    };
  }

  const turnstileOk = await verifyTurnstileToken(parsed.data.turnstileToken, ip);
  if (!turnstileOk) {
    return {
      error: "No se pudo verificar que eres humano. Recarga la página.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: "Email o contraseña incorrectos" };
  }

  // Usuarios bloqueados no pueden entrar.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_blocked")
    .eq("id", data.user.id)
    .single();

  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta está bloqueada. Contacta con un administrador." };
  }

  // Volver a la URL que el usuario estaba viendo antes de expirar la sesión.
  const rawRedirect = formData.get("redirectTo");
  const redirectTo =
    typeof rawRedirect === "string" &&
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/";

  redirect(redirectTo);
}

/** Cierra la sesión y vuelve al login. */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
