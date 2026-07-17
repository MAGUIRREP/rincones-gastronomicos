import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Sitemap con las páginas públicas y todas las fichas. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/restaurantes`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/mapa`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/dashboard`, changeFrequency: "weekly", priority: 0.5 },
  ];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("restaurants")
      .select("id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1000);

    const fichas: MetadataRoute.Sitemap = (data ?? []).map((r) => ({
      url: `${siteUrl}/restaurantes/${r.id}`,
      lastModified: new Date(r.updated_at),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

    return [...staticPages, ...fichas];
  } catch {
    return staticPages;
  }
}
