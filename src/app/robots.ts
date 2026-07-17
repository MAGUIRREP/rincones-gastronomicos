import type { MetadataRoute } from "next";

/**
 * Aplicación privada (requiere login): se bloquea la indexación.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
