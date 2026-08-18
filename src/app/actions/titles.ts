"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { toSlug } from "@/lib/slug";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const nullable = (form: FormData, key: string) => value(form, key) || null;
const routeFor = (type: string) => type === "movie" ? "/dashboard/movies" : "/dashboard/shows";

function payload(form: FormData) {
  const contentType = value(form, "content_type");
  const title = value(form, "title");
  const slug = toSlug(value(form, "slug") || title);
  const workflowStatus = value(form, "workflow_status") === "ready" ? "ready" : "draft";
  if (!new Set(["movie", "show"]).has(contentType) || !title || !slug) redirect(`${routeFor(contentType)}?error=invalid_content`);
  return { content_type: contentType, title, slug, description: nullable(form, "description"), category_id: nullable(form, "category_id"), poster_asset_id: nullable(form, "poster_asset_id"), thumbnail_asset_id: nullable(form, "thumbnail_asset_id"), trailer_asset_id: nullable(form, "trailer_asset_id"), video_asset_id: contentType === "movie" ? nullable(form, "video_asset_id") : null, is_free: form.get("is_free") === "on", workflow_status: workflowStatus, sort_order: Number.parseInt(value(form, "sort_order") || "0", 10) || 0 };
}

export async function createTitle(formData: FormData) {
  const { supabase } = await requireAdmin();
  const data = payload(formData);
  const path = routeFor(data.content_type);
  const { error } = await supabase.from("cms_titles").insert(data);
  if (error) redirect(`${path}?error=${error.code === "23505" ? "duplicate_slug" : "save_failed"}`);
  revalidatePath(path); redirect(`${path}?success=created`);
}

export async function updateTitle(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = value(formData, "id");
  const data = payload(formData);
  const path = routeFor(data.content_type);
  const { error } = await supabase.from("cms_titles").update(data).eq("id", id).eq("content_type", data.content_type).is("deleted_at", null);
  if (error) redirect(`${path}?error=${error.code === "23505" ? "duplicate_slug" : "save_failed"}`);
  revalidatePath(path); redirect(`${path}?success=updated`);
}

export async function archiveTitle(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = value(formData, "id");
  const contentType = value(formData, "content_type");
  const path = routeFor(contentType);
  if (contentType === "show") {
    const { count } = await supabase.from("cms_seasons").select("id", { count: "exact", head: true }).eq("show_id", id).is("deleted_at", null);
    if ((count ?? 0) > 0) redirect(`${path}?error=show_has_seasons`);
  }
  const { error } = await supabase.from("cms_titles").update({ deleted_at: new Date().toISOString(), workflow_status: "archived" }).eq("id", id).eq("content_type", contentType).is("deleted_at", null);
  if (error) redirect(`${path}?error=delete_failed`);
  revalidatePath(path); redirect(`${path}?success=archived`);
}
