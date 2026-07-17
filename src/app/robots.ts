import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Web de lectura pública: se permite la indexación excepto en las
 * zonas privadas (administración, login y formularios de edición).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/login", "/restaurantes/nuevo", "/*/editar"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
