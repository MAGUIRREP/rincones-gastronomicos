"use client";

import { useInactivityLogout } from "@/hooks/use-inactivity-logout";

/** Componente sin UI que activa el cierre de sesión por inactividad. */
export function InactivityWatcher() {
  useInactivityLogout();
  return null;
}
