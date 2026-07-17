import "server-only";

/**
 * Rate limiter en memoria (ventana deslizante simple).
 *
 * En Vercel cada instancia serverless tiene su propia memoria, por lo
 * que este límite es "best effort": suficiente para frenar fuerza bruta
 * casual en el login junto con Turnstile y los límites propios de
 * Supabase Auth. Para un límite distribuido real, usar Upstash Redis
 * (tiene free tier) — el código está aislado aquí para poder cambiarlo.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const MAX_ENTRIES = 10_000;

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { success: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    // Evitar crecimiento sin límite de la tabla.
    if (buckets.size > MAX_ENTRIES) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0 };
  }

  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count };
}
