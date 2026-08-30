"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { databaseErrorCode } from "@/lib/database-errors";
import {
  importedSlug,
  isLegacyTrailer,
  legacyContentType,
  legacyProviderId,
  type LegacyShow,
  type LegacyVideo,
} from "@/lib/legacy-import";

const path = "/dashboard/import-legacy";

type MediaRow = { id: string; provider_id: string; deleted_at: string | null };

export async function importLegacyDrafts(formData: FormData) {
  if (String(formData.get("confirmation") ?? "").trim() !== "IMPORT DRAFTS") {
    redirect(`${path}?error=confirmation_required`);
  }

  const { supabase } = await requireAdmin();
  const [showsResult, videosResult, mediaResult, titlesResult] = await Promise.all([
    supabase.from("shows").select("id,title,thumbnail_url,created_at").order("created_at"),
    supabase.from("videos").select("id,show_id,title,description,video_url,thumbnail_url,type,is_featured,is_free,created_at").order("created_at"),
    supabase.from("cms_media_assets").select("id,provider_id,deleted_at"),
    supabase.from("cms_titles").select("id,legacy_show_id,content_type").is("deleted_at", null),
  ]);
  const firstError = showsResult.error ?? videosResult.error ?? mediaResult.error ?? titlesResult.error;
  if (firstError) redirect(`${path}?error=${databaseErrorCode(firstError, "load_failed")}`);

  const shows = (showsResult.data ?? []) as LegacyShow[];
  const videos = (videosResult.data ?? []) as LegacyVideo[];
  const mediaByProvider = new Map((mediaResult.data as MediaRow[] | null)?.map((item) => [item.provider_id, item]));
  const titleByLegacyShow = new Map((titlesResult.data ?? []).filter((item) => item.legacy_show_id).map((item) => [item.legacy_show_id as string, item]));

  const requiredProviderIds = new Set<string>();
  for (const show of shows) {
    if (show.thumbnail_url) {
      const id = legacyProviderId(show.thumbnail_url, "image");
      if (!id) redirect(`${path}?error=invalid_legacy_url`);
      requiredProviderIds.add(id);
    }
  }
  for (const video of videos) {
    const id = legacyProviderId(video.video_url, "stream");
    if (!id) redirect(`${path}?error=invalid_legacy_url`);
    requiredProviderIds.add(id);
    if (video.thumbnail_url) {
      const thumbnailId = legacyProviderId(video.thumbnail_url, "image");
      if (!thumbnailId) redirect(`${path}?error=invalid_legacy_url`);
      requiredProviderIds.add(thumbnailId);
    }
  }
  if ([...requiredProviderIds].some((id) => mediaByProvider.get(id)?.deleted_at)) {
    redirect(`${path}?error=archived_media_conflict`);
  }

  async function ensureMedia(input: {
    kind: "image" | "video" | "trailer";
    providerId: string;
    publicUrl: string;
    thumbnailUrl: string | null;
    filename: string;
    mimeType: string;
  }) {
    const existing = mediaByProvider.get(input.providerId);
    if (existing) return existing.id;
    const { data, error } = await supabase.from("cms_media_assets").insert({
      kind: input.kind,
      provider_id: input.providerId,
      public_url: input.publicUrl,
      thumbnail_url: input.thumbnailUrl,
      filename: input.filename,
      mime_type: input.mimeType,
      status: "ready",
    }).select("id,provider_id,deleted_at").single();
    if (error) redirect(`${path}?error=${databaseErrorCode(error, "import_failed")}`);
    const row = data as MediaRow;
    mediaByProvider.set(row.provider_id, row);
    return row.id;
  }

  const imageAssetByUrl = new Map<string, string>();
  for (const show of shows) {
    if (!show.thumbnail_url) continue;
    const providerId = legacyProviderId(show.thumbnail_url, "image")!;
    imageAssetByUrl.set(show.thumbnail_url, await ensureMedia({
      kind: "image",
      providerId,
      publicUrl: show.thumbnail_url,
      thumbnailUrl: show.thumbnail_url,
      filename: `${show.title} thumbnail`,
      mimeType: "image/*",
    }));
  }

  const videoAssetByLegacyId = new Map<string, string>();
  for (const video of videos) {
    if (video.thumbnail_url && !imageAssetByUrl.has(video.thumbnail_url)) {
      const thumbnailProviderId = legacyProviderId(video.thumbnail_url, "image")!;
      imageAssetByUrl.set(video.thumbnail_url, await ensureMedia({
        kind: "image",
        providerId: thumbnailProviderId,
        publicUrl: video.thumbnail_url,
        thumbnailUrl: video.thumbnail_url,
        filename: `${video.title} thumbnail`,
        mimeType: "image/*",
      }));
    }
    const providerId = legacyProviderId(video.video_url, "stream")!;
    videoAssetByLegacyId.set(video.id, await ensureMedia({
      kind: isLegacyTrailer(video) ? "trailer" : "video",
      providerId,
      publicUrl: video.video_url,
      thumbnailUrl: video.thumbnail_url,
      filename: video.title,
      mimeType: "application/vnd.apple.mpegurl",
    }));
  }

  let importedTitles = 0;
  let importedSeasons = 0;
  let importedEpisodes = 0;
  for (const show of shows) {
    const related = videos.filter((video) => video.show_id === show.id);
    const trailers = related.filter(isLegacyTrailer);
    const playable = related.filter((video) => !isLegacyTrailer(video));
    const contentType = legacyContentType(show, related);
    let titleId = titleByLegacyShow.get(show.id)?.id as string | undefined;

    if (!titleId) {
      const mainVideo = contentType === "movie" ? playable[0] : undefined;
      const description = mainVideo?.description ?? trailers[0]?.description ?? null;
      const { data, error } = await supabase.from("cms_titles").insert({
        content_type: contentType,
        title: show.title,
        slug: importedSlug(show.title, show.id),
        description,
        thumbnail_asset_id: show.thumbnail_url ? imageAssetByUrl.get(show.thumbnail_url) ?? null : null,
        trailer_asset_id: trailers[0] ? videoAssetByLegacyId.get(trailers[0].id) ?? null : null,
        video_asset_id: mainVideo ? videoAssetByLegacyId.get(mainVideo.id) ?? null : null,
        is_free: mainVideo?.is_free ?? false,
        is_featured: false,
        workflow_status: "draft",
        sort_order: 0,
        legacy_show_id: show.id,
        legacy_video_id: mainVideo?.id ?? null,
      }).select("id,legacy_show_id,content_type").single();
      if (error) redirect(`${path}?error=${databaseErrorCode(error, "import_failed")}`);
      titleId = data.id;
      titleByLegacyShow.set(show.id, data);
      importedTitles += 1;
    }

    if (contentType !== "show") continue;
    const { data: existingSeason, error: seasonReadError } = await supabase.from("cms_seasons").select("id").eq("show_id", titleId).eq("season_number", 1).is("deleted_at", null).maybeSingle();
    if (seasonReadError) redirect(`${path}?error=${databaseErrorCode(seasonReadError, "import_failed")}`);
    let seasonId = existingSeason?.id;
    if (!seasonId) {
      const { data, error } = await supabase.from("cms_seasons").insert({
        show_id: titleId,
        season_number: 1,
        title: "Season 1",
        thumbnail_asset_id: show.thumbnail_url ? imageAssetByUrl.get(show.thumbnail_url) ?? null : null,
        workflow_status: "draft",
        sort_order: 0,
      }).select("id").single();
      if (error) redirect(`${path}?error=${databaseErrorCode(error, "import_failed")}`);
      seasonId = data.id;
      importedSeasons += 1;
    }

    for (const [index, episode] of playable.entries()) {
      const { data: existingEpisode, error: episodeReadError } = await supabase.from("cms_episodes").select("id").eq("legacy_video_id", episode.id).is("deleted_at", null).maybeSingle();
      if (episodeReadError) redirect(`${path}?error=${databaseErrorCode(episodeReadError, "import_failed")}`);
      if (existingEpisode) continue;
      const { error } = await supabase.from("cms_episodes").insert({
        show_id: titleId,
        season_id: seasonId,
        episode_number: index + 1,
        title: episode.title,
        slug: importedSlug(episode.title, episode.id),
        description: episode.description,
        thumbnail_asset_id: episode.thumbnail_url ? imageAssetByUrl.get(episode.thumbnail_url) ?? null : null,
        video_asset_id: videoAssetByLegacyId.get(episode.id) ?? null,
        is_free: episode.is_free,
        workflow_status: "draft",
        sort_order: index,
        legacy_video_id: episode.id,
      });
      if (error) redirect(`${path}?error=${databaseErrorCode(error, "import_failed")}`);
      importedEpisodes += 1;
    }
  }

  revalidatePath(path);
  revalidatePath("/dashboard/media");
  revalidatePath("/dashboard/movies");
  revalidatePath("/dashboard/shows");
  revalidatePath("/dashboard/episodes");
  redirect(`${path}?success=imported&titles=${importedTitles}&seasons=${importedSeasons}&episodes=${importedEpisodes}`);
}
