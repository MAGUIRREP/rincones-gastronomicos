import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Keep-alive: Supabase Free pausa los proyectos sin "actividad
 * suficiente" durante ~7 días. Este endpoint lo llama a diario el cron
 * de Vercel (ver "crons" en vercel.json) y, como respaldo, un workflow
 * de GitHub Actions; también puede abrirse a mano en el navegador.
 *
 * En el proyecto principal se hace una ESCRITURA (tabla keep_alive):
 * una lectura trivial puede no contar como actividad suficiente, una
 * escritura sí. De paso queda registrado cuándo y desde dónde se hizo
 * el último ping, lo que permite comprobar si el cron funciona de
 * verdad consultando esa tabla.
 *
 * Las claves "anon" son públicas por diseño (se envían a todos los
 * navegadores que visitan cada web) y los datos siguen protegidos por
 * Row Level Security.
 */

// Se fuerza la ejecución dinámica: nunca debe servirse una respuesta
// cacheada, porque entonces no habría petición real a Supabase.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Proyectos en los que solo se puede leer (no hay clave de servicio). */
const READ_ONLY_TARGETS = [
  {
    name: "comunidad-vecinos",
    baseUrl: "https://gdqreynlaoeotxpplmmc.supabase.co",
    paths: ["/rest/v1/incidencias?select=id&limit=1", "/rest/v1/perfiles?select=id&limit=1"],
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcXJleW5sYW9lb3R4cHBsbW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NzE2MTgsImV4cCI6MjA5OTE0NzYxOH0.-HGSXhPwuXhjepKGSEsiWscxqX50pf_f9Fy2yxN7Lto",
  },
];

interface PingResult {
  name: string;
  ok: boolean;
  detail: string;
}

/** Escritura real en el proyecto principal. */
async function pingMainProject(source: string): Promise<PingResult> {
  try {
    const admin = createAdminClient();

    // Se lee el contador actual para incrementarlo (una lectura y una
    // escritura: el patrón de actividad más parecido al uso real).
    const { data: current } = await admin
      .from("keep_alive")
      .select("ping_count")
      .eq("id", 1)
      .maybeSingle();

    const { error } = await admin.from("keep_alive").upsert({
      id: 1,
      last_ping: new Date().toISOString(),
      ping_count: (current?.ping_count ?? 0) + 1,
      source,
    });

    if (error) {
      return {
        name: "rincones-gastronomicos",
        ok: false,
        detail: `error al escribir: ${error.message}`,
      };
    }
    return {
      name: "rincones-gastronomicos",
      ok: true,
      detail: `escritura correcta (ping nº ${(current?.ping_count ?? 0) + 1})`,
    };
  } catch (error) {
    return {
      name: "rincones-gastronomicos",
      ok: false,
      detail: error instanceof Error ? error.message : "error desconocido",
    };
  }
}

/** Lecturas en los proyectos donde no hay clave de servicio. */
async function pingReadOnlyProject(
  target: (typeof READ_ONLY_TARGETS)[number],
): Promise<PingResult> {
  const statuses: number[] = [];
  for (const path of target.paths) {
    try {
      const res = await fetch(`${target.baseUrl}${path}`, {
        headers: {
          apikey: target.anonKey,
          Authorization: `Bearer ${target.anonKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      statuses.push(res.status);
    } catch {
      statuses.push(0);
    }
  }
  const ok = statuses.some((s) => s === 200);
  return {
    name: target.name,
    ok,
    detail: `respuestas: ${statuses.join(", ")}`,
  };
}

export async function GET(request: Request) {
  // Modo consulta (/api/keep-alive?check): solo informa de cuándo fue
  // el último ping y quién lo hizo, sin registrar uno nuevo. Sirve para
  // comprobar si el cron está funcionando de verdad.
  if (new URL(request.url).searchParams.has("check")) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("keep_alive")
        .select("last_ping, ping_count, source")
        .eq("id", 1)
        .maybeSingle();

      const lastPing = data?.last_ping ? new Date(data.last_ping) : null;
      const hoursAgo = lastPing
        ? Math.round((Date.now() - lastPing.getTime()) / 36e5)
        : null;

      return NextResponse.json(
        {
          ultimoPing: data?.last_ping ?? null,
          haceHoras: hoursAgo,
          disparador: data?.source ?? null,
          totalPings: data?.ping_count ?? 0,
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "error" },
        { status: 500 },
      );
    }
  }

  // Vercel identifica sus ejecuciones con esta cabecera; un cron externo
  // puede mandar la suya. Así se sabe qué disparador funciona realmente.
  const headerSource = request.headers.get("x-vercel-cron")
    ? "vercel-cron"
    : request.headers.get("x-keep-alive-source") ?? "manual";

  const [main, ...others] = await Promise.all([
    pingMainProject(headerSource),
    ...READ_ONLY_TARGETS.map(pingReadOnlyProject),
  ]);

  const results = [main, ...others];
  const allOk = results.every((r) => r.ok);

  return NextResponse.json(
    { ok: allOk, source: headerSource, results, at: new Date().toISOString() },
    {
      status: allOk ? 200 : 500,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
