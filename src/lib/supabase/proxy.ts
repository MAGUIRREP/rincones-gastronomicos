import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  LAST_ACTIVITY_COOKIE,
  SESSION_TIMEOUT_MINUTES,
} from "@/lib/constants";

/**
 * La web es de lectura pública. Solo requieren sesión las rutas
 * de escritura y administración.
 */
function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (pathname === "/restaurantes/nuevo") return true;
  if (/^\/restaurantes\/[^/]+\/editar/.test(pathname)) return true;
  return false;
}

/**
 * Refresca la sesión de Supabase en cada petición y aplica:
 *  - expiración por inactividad (30 minutos)
 *  - protección de rutas de escritura con redirección a /login
 *    conservando la URL original (redirectTo)
 *  - bloqueo de /admin para usuarios sin rol admin
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: options?.httpOnly ?? false,
              sameSite: options?.sameSite ?? "lax",
              secure: process.env.NODE_ENV === "production",
            }),
          );
        },
      },
    },
  );

  // IMPORTANTE: getUser() valida el token contra el servidor de Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Guardamos la URL original para volver tras el login.
    if (pathname !== "/" || search) {
      url.searchParams.set("redirectTo", `${pathname}${search}`);
    }
    const redirect = NextResponse.redirect(url);
    redirect.cookies.delete(LAST_ACTIVITY_COOKIE);
    return redirect;
  };

  if (!user) {
    if (isProtectedPath(pathname)) {
      return redirectToLogin();
    }
    return response;
  }

  // ---- Expiración por inactividad (solo sesiones abiertas) ----
  const lastActivity = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
  const now = Date.now();
  const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;

  if (lastActivity && now - Number(lastActivity) > timeoutMs) {
    await supabase.auth.signOut();
    return redirectToLogin();
  }

  // Renovar la marca de actividad en cada petición.
  response.cookies.set(LAST_ACTIVITY_COOKIE, String(now), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TIMEOUT_MINUTES * 60,
  });

  // Usuario autenticado que visita /login: mandarlo a la home
  // (o a la URL guardada en redirectTo).
  if (pathname === "/login") {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      const target = request.nextUrl.clone();
      const [p, q] = redirectTo.split("?");
      target.pathname = p;
      target.search = q ? `?${q}` : "";
      return NextResponse.redirect(target);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ---- Protección del panel de administración ----
  if (pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_blocked")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || profile.is_blocked) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
