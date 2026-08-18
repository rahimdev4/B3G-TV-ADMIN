"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { toSlug } from "@/lib/slug";

const path = "/dashboard/episodes";
const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (form: FormData, key: string) => value(form, key) || null;
const positive = (form: FormData, key: string) => Math.max(1, Number.parseInt(value(form, key), 10) || 1);

function seasonPayload(form: FormData) {
  return { show_id: value(form, "show_id"), season_number: positive(form, "season_number"), title: optional(form, "title"), description: optional(form, "description"), thumbnail_asset_id: optional(form, "thumbnail_asset_id"), workflow_status: value(form, "workflow_status") === "ready" ? "ready" : "draft", sort_order: Number.parseInt(value(form, "sort_order") || "0", 10) || 0 };
}

function episodePayload(form: FormData) {
  const title = value(form, "title");
  return { show_id: value(form, "show_id"), season_id: value(form, "season_id"), episode_number: positive(form, "episode_number"), title, slug: toSlug(value(form, "slug") || title), description: optional(form, "description"), thumbnail_asset_id: optional(form, "thumbnail_asset_id"), trailer_asset_id: optional(form, "trailer_asset_id"), video_asset_id: optional(form, "video_asset_id"), duration_sec: optional(form, "duration_sec") ? Math.max(0, Number.parseInt(value(form, "duration_sec"), 10) || 0) : null, is_free: form.get("is_free") === "on", workflow_status: value(form, "workflow_status") === "ready" ? "ready" : "draft", sort_order: Number.parseInt(value(form, "sort_order") || "0", 10) || 0 };
}

export async function createSeason(formData: FormData) {
  const { supabase } = await requireAdmin(); const data = seasonPayload(formData);
  if (!data.show_id) redirect(`${path}?error=invalid_season`);
  const { data: show } = await supabase.from("cms_titles").select("id").eq("id", data.show_id).eq("content_type", "show").is("deleted_at", null).maybeSingle();
  if (!show) redirect(`${path}?error=invalid_show`);
  const { error } = await supabase.from("cms_seasons").insert(data);
  if (error) redirect(`${path}?error=${error.code === "23505" ? "duplicate_season" : "save_failed"}`);
  revalidatePath(path); redirect(`${path}?success=season_created`);
}

export async function updateSeason(formData: FormData) {
  const { supabase } = await requireAdmin(); const data = seasonPayload(formData);
  const { error } = await supabase.from("cms_seasons").update(data).eq("id", value(formData, "id")).is("deleted_at", null);
  if (error) redirect(`${path}?error=${error.code === "23505" ? "duplicate_season" : "save_failed"}`);
  revalidatePath(path); redirect(`${path}?success=season_updated`);
}

export async function archiveSeason(formData: FormData) {
  const { supabase } = await requireAdmin(); const id = value(formData, "id");
  const { count } = await supabase.from("cms_episodes").select("id", { count: "exact", head: true }).eq("season_id", id).is("deleted_at", null);
  if ((count ?? 0) > 0) redirect(`${path}?error=season_has_episodes`);
  const { error } = await supabase.from("cms_seasons").update({ deleted_at: new Date().toISOString(), workflow_status: "archived" }).eq("id", id).is("deleted_at", null);
  if (error) redirect(`${path}?error=delete_failed`); revalidatePath(path); redirect(`${path}?success=season_archived`);
}

export async function createEpisode(formData: FormData) {
  const { supabase } = await requireAdmin(); const data = episodePayload(formData);
  if (!data.show_id || !data.season_id || !data.title || !data.slug) redirect(`${path}?error=invalid_episode`);
  const { data: season } = await supabase.from("cms_seasons").select("id").eq("id", data.season_id).eq("show_id", data.show_id).is("deleted_at", null).maybeSingle();
  if (!season) redirect(`${path}?error=season_show_mismatch`);
  const { error } = await supabase.from("cms_episodes").insert(data);
  if (error) redirect(`${path}?error=${error.code === "23505" ? "duplicate_episode" : "save_failed"}`);
  revalidatePath(path); revalidatePath("/dashboard/publishing");
  redirect(data.workflow_status === "ready" ? `/dashboard/publishing?ready=${data.show_id}` : `${path}?success=episode_created`);
}

export async function updateEpisode(formData: FormData) {
  const { supabase } = await requireAdmin(); const data = episodePayload(formData);
  const { data: season } = await supabase.from("cms_seasons").select("id").eq("id", data.season_id).eq("show_id", data.show_id).is("deleted_at", null).maybeSingle();
  if (!season) redirect(`${path}?error=season_show_mismatch`);
  const { error } = await supabase.from("cms_episodes").update(data).eq("id", value(formData, "id")).is("deleted_at", null);
  if (error) redirect(`${path}?error=${error.code === "23505" ? "duplicate_episode" : "save_failed"}`);
  revalidatePath(path); revalidatePath("/dashboard/publishing");
  redirect(data.workflow_status === "ready" ? `/dashboard/publishing?ready=${data.show_id}` : `${path}?success=episode_updated`);
}

export async function archiveEpisode(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("cms_episodes").update({ deleted_at: new Date().toISOString(), workflow_status: "archived" }).eq("id", value(formData, "id")).is("deleted_at", null);
  if (error) redirect(`${path}?error=delete_failed`); revalidatePath(path); redirect(`${path}?success=episode_archived`);
}
