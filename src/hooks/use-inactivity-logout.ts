"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { SESSION_TIMEOUT_MINUTES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"];

/**
 * Cierra la sesión en cliente tras 30 minutos sin interacción.
 *
 * Complementa la comprobación del proxy (servidor): el proxy expira la
 * sesión entre peticiones; este hook cubre el caso de una pestaña
 * abierta sin navegar. Al expirar redirige a /login guardando la URL
 * actual en redirectTo.
 */
export function useInactivityLogout() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Referencias estables para no reiniciar los listeners en cada render.
  const currentUrlRef = useRef("");
  useEffect(() => {
    const qs = searchParams.toString();
    currentUrlRef.current = qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;

    const expire = async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      const redirectTo = encodeURIComponent(currentUrlRef.current || "/");
      router.push(`/login?redirectTo=${redirectTo}`);
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(expire, timeoutMs);
    };

    resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [router]);
}
