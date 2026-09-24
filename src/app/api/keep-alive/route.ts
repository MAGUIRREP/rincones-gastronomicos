import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Keep-alive: Supabase Free pausa los proyectos sin "actividad
 * suficiente" durante ~7 días. Este endpoint lo llama a diario el cron
 * de Vercel (ver "crons" en vercel.json) y un cron externo de respaldo;
 * también puede abrirse a mano en el navegador.
 *
 * En ambos proyectos se hace una ESCRITURA en la tabla keep_alive: una
 * lectura trivial puede no contar como actividad suficiente, una
 * escritura sí. Además queda registrado cuándo y desde dónde se hizo el
 * último ping, lo que permite comprobar si el cron funciona de verdad.
 *
 * Cada proyecto usa la vía que tiene disponible:
 *  - rincones-gastronomicos: clave de servicio (escritura directa).
 *  - comunidad-vecinos: clave pública + función ping_keep_alive, que
 *    solo permite actualizar esa fila y nada más.
 */

// Nunca debe servirse una respuesta cacheada: sin petición real a
// Supabase no habría actividad y el keep-alive no serviría de nada.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COMUNIDAD_VECINOS = {
  name: "comunidad-vecinos",
  baseUrl: "https://gdqreynlaoeotxpplmmc.supabase.co",
  // Clave pública, la misma que viaja en el JS de esa web.
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcXJleW5sYW9lb3R4cHBsbW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NzE2MTgsImV4cCI6MjA5OTE0NzYxOH0.-HGSXhPwuXhjepKGSEsiWscxqX50pf_f9Fy2yxN7Lto",
};

interface PingResult {
  name: string;
  ok: boolean;
  detail: string;
}

interface StatusResult {
  proyecto: string;
  ultimoPing: string | null;
  haceHoras: number | null;
  disparador: string | null;
  totalPings: number;
}

function hoursSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso).getTime()) / 36e5);
}

/** Escritura en el proyecto principal con la clave de servicio. */
async function pingRincones(source: string): Promise<PingResult> {
  try {
    const admin = createAdminClient();

    const { data: current } = await admin
      .from("keep_alive")
      .select("ping_count")
      .eq("id", 1)
      .maybeSingle();

    const nextCount = (current?.ping_count ?? 0) + 1;
    const { error } = await admin.from("keep_alive").upsert({
      id: 1,
      last_ping: new Date().toISOString(),
      ping_count: nextCount,
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
      detail: `escritura correcta (ping nº ${nextCount})`,
    };
  } catch (error) {
    return {
      name: "rincones-gastronomicos",
      ok: false,
      detail: error instanceof Error ? error.message : "error desconocido",
    };
  }
}

/** Escritura en comunidad-vecinos a través de la función ping_keep_alive. */
async function pingComunidadVecinos(source: string): Promise<PingResult> {
  try {
    const res = await fetch(
      `${COMUNIDAD_VECINOS.baseUrl}/rest/v1/rpc/ping_keep_alive`,
      {
        method: "POST",
        headers: {
          apikey: COMUNIDAD_VECINOS.anonKey,
          Authorization: `Bearer ${COMUNIDAD_VECINOS.anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_source: source }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return {
        name: COMUNIDAD_VECINOS.name,
        ok: false,
        detail: `error al escribir (${res.status}): ${text.slice(0, 150)}`,
      };
    }
    return {
      name: COMUNIDAD_VECINOS.name,
      ok: true,
      detail: "escritura correcta",
    };
  } catch (error) {
    return {
      name: COMUNIDAD_VECINOS.name,
      ok: false,
      detail: error instanceof Error ? error.message : "error desconocido",
    };
  }
}

/** Estado actual de ambos proyectos, sin registrar ningún ping. */
async function readStatus(): Promise<StatusResult[]> {
  const results: StatusResult[] = [];

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("keep_alive")
      .select("last_ping, ping_count, source")
      .eq("id", 1)
      .maybeSingle();

    results.push({
      proyecto: "rincones-gastronomicos",
      ultimoPing: data?.last_ping ?? null,
      haceHoras: hoursSince(data?.last_ping),
      disparador: data?.source ?? null,
      totalPings: data?.ping_count ?? 0,
    });
  } catch {
    results.push({
      proyecto: "rincones-gastronomicos",
      ultimoPing: null,
      haceHoras: null,
      disparador: null,
      totalPings: 0,
    });
  }

  try {
    const res = await fetch(
      `${COMUNIDAD_VECINOS.baseUrl}/rest/v1/keep_alive?select=last_ping,ping_count,source&id=eq.1`,
      {
        headers: {
          apikey: COMUNIDAD_VECINOS.anonKey,
          Authorization: `Bearer ${COMUNIDAD_VECINOS.anonKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    const rows = res.ok
      ? ((await res.json()) as {
          last_ping?: string;
          ping_count?: number;
          source?: string;
        }[])
      : [];
    const row = rows[0];

    results.push({
      proyecto: COMUNIDAD_VECINOS.name,
      ultimoPing: row?.last_ping ?? null,
      haceHoras: hoursSince(row?.last_ping),
      disparador: row?.source ?? null,
      totalPings: row?.ping_count ?? 0,
    });
  } catch {
    results.push({
      proyecto: COMUNIDAD_VECINOS.name,
      ultimoPing: null,
      haceHoras: null,
      disparador: null,
      totalPings: 0,
    });
  }

  return results;
}

export async function GET(request: Request) {
  // Modo consulta (/api/keep-alive?check): informa del estado de ambos
  // proyectos sin registrar un ping nuevo.
  if (new URL(request.url).searchParams.has("check")) {
    return NextResponse.json(
      { proyectos: await readStatus(), at: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  // Vercel identifica sus ejecuciones con esta cabecera; un cron externo
  // puede mandar la suya. Así se sabe qué disparador funciona realmente.
  const source = request.headers.get("x-vercel-cron")
    ? "vercel-cron"
    : request.headers.get("x-keep-alive-source") ?? "manual";

  const results = await Promise.all([
    pingRincones(source),
    pingComunidadVecinos(source),
  ]);
  const allOk = results.every((r) => r.ok);

  return NextResponse.json(
    { ok: allOk, source, results, at: new Date().toISOString() },
    {
      status: allOk ? 200 : 500,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
