import "server-only";

/**
 * Verifica un token de Cloudflare Turnstile en el servidor.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstileToken(
  token: string,
  ip?: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // En desarrollo sin clave configurada se permite el paso
  // (Cloudflare ofrece claves de test: 1x0000000000000000000000000000000AA).
  if (!secret) {
    console.warn("TURNSTILE_SECRET_KEY no configurada; se omite verificación");
    return process.env.NODE_ENV !== "production";
  }

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      },
    );
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (error) {
    console.error("Error verificando Turnstile:", error);
    return false;
  }
}
