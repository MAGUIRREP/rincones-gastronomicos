/**
 * Utilidades para enlaces de YouTube: extraer el ID del vídeo
 * y construir la URL de incrustación (embed) segura.
 */

export function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      const match = parsed.pathname.match(/^\/(embed|shorts)\/([\w-]+)/);
      if (match) return match[2];
    }
    return null;
  } catch {
    return null;
  }
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
  // youtube-nocookie: modo de privacidad mejorada.
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
