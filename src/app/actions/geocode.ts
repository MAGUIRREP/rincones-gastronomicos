"use server";

import { headers } from "next/headers";

import { reverseGeocode, type GeocodeResult } from "@/lib/geocode";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export interface GeocodeActionResult {
  success: boolean;
  data?: GeocodeResult;
  error?: string;
}

/**
 * Rellena dirección, municipio, provincia y país a partir de unas
 * coordenadas. Solo para usuarios con sesión (es una ayuda del
 * formulario) y con un límite por IP para no abusar de Nominatim.
 */
export async function reverseGeocodeAction(
  latitude: number,
  longitude: number,
): Promise<GeocodeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sesión expirada" };

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return { success: false, error: "Coordenadas no válidas" };
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "unknown";

  // Máximo 30 consultas por IP cada 10 minutos.
  const { success } = rateLimit(`geocode:${ip}`, {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!success) {
    return {
      success: false,
      error: "Demasiadas consultas de dirección. Espera unos minutos.",
    };
  }

  const result = await reverseGeocode(latitude, longitude);
  if (!result) {
    return { success: false, error: "No se pudo obtener la dirección" };
  }
  return { success: true, data: result };
}
