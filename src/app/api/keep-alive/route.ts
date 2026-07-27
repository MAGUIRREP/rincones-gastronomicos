import { NextResponse } from "next/server";

/**
 * Keep-alive: Supabase Free pausa los proyectos tras ~7 días sin
 * peticiones. Vercel Cron llama a este endpoint una vez al día
 * (ver "crons" en vercel.json) y aquí se hace una consulta mínima
 * a cada proyecto para que nunca se consideren inactivos.
 *
 * Las claves "anon" son públicas por diseño (se envían a todos los
 * navegadores que visitan cada web); los datos están protegidos por
 * Row Level Security, y estas consultas devuelven 1 fila o ninguna.
 */

const TARGETS = [
  {
    name: "rincones-gastronomicos",
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/comunidades?select=id&limit=1`,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  {
    name: "comunidad-vecinos",
    url: "https://gdqreynlaoeotxpplmmc.supabase.co/rest/v1/incidencias?select=id&limit=1",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcXJleW5sYW9lb3R4cHBsbW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NzE2MTgsImV4cCI6MjA5OTE0NzYxOH0.-HGSXhPwuXhjepKGSEsiWscxqX50pf_f9Fy2yxN7Lto",
  },
];

export async function GET() {
  const results = await Promise.all(
    TARGETS.map(async (target) => {
      try {
        const res = await fetch(target.url, {
          headers: {
            apikey: target.anonKey,
            Authorization: `Bearer ${target.anonKey}`,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        return { name: target.name, ok: res.ok, status: res.status };
      } catch {
        return { name: target.name, ok: false, status: 0 };
      }
    }),
  );

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    { ok: allOk, results, at: new Date().toISOString() },
    { status: allOk ? 200 : 500 },
  );
}
