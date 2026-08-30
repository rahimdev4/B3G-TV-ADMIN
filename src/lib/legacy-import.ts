import { toSlug } from "@/lib/slug";

export type LegacyShow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  created_at: string;
};

export type LegacyVideo = {
  id: string;
  show_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  type: "clip" | "episode";
  is_featured: boolean;
  is_free: boolean;
  created_at: string;
};

const knownMovies = new Set(["carter high", "primary position", "boss and i"]);

export function legacyContentType(show: LegacyShow, videos: LegacyVideo[]): "movie" | "show" {
  const title = show.title.trim().toLowerCase();
  if (knownMovies.has(title)) return "movie";
  if (videos.some((video) => /full\s+movie/i.test(video.title))) return "movie";
  return "show";
}

export function isLegacyTrailer(video: LegacyVideo) {
  return video.type === "clip" || /\btrailer\b/i.test(video.title);
}

export function legacyProviderId(url: string, kind: "image" | "stream") {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (kind === "image" && parsed.hostname === "imagedelivery.net" && parts.length >= 2) return parts[1];
    if (kind === "stream" && /(?:cloudflarestream|videodelivery)\.com$/.test(parsed.hostname) && parts.length >= 1) return parts[0];
  } catch {
    return null;
  }
  return null;
}

export function importedSlug(title: string, legacyId: string) {
  return `${toSlug(title) || "legacy-content"}-legacy-${legacyId.slice(0, 8)}`;
}
