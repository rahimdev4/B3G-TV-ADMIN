"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { legacyWritesEnabled } from "@/lib/env";

const path = "/dashboard/legacy";
const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const nullable = (form: FormData, key: string) => value(form, key) || null;

function requireLiveWriteConfirmation(form: FormData) {
  if (!legacyWritesEnabled()) redirect(`${path}?error=writes_locked`);
  if (value(form, "live_confirmation") !== "LIVE") redirect(`${path}?error=confirmation_required`);
}

function validUrl(input: string | null) {
  if (!input) return true;
  try {
    return new URL(input).protocol === "https:";
  } catch {
    return false;
  }
}

function showPayload(form: FormData) {
  const title = value(form, "title");
  const thumbnail_url = nullable(form, "thumbnail_url");
  if (!title || !validUrl(thumbnail_url)) redirect(`${path}?error=invalid_show`);
  return { title, thumbnail_url };
}

function videoPayload(form: FormData) {
  const show_id = value(form, "show_id");
  const title = value(form, "title");
  const video_url = value(form, "video_url");
  const thumbnail_url = nullable(form, "thumbnail_url");
  const type = value(form, "type");
  if (!show_id || !title || !validUrl(video_url) || !validUrl(thumbnail_url) || !new Set(["episode", "clip"]).has(type)) redirect(`${path}?error=invalid_video`);
  return { show_id, title, description: nullable(form, "description"), video_url, thumbnail_url, type, is_featured: form.get("is_featured") === "on", is_free: form.get("is_free") === "on" };
}

export async function updateLegacyLiveTvUrl(formData: FormData) {
  requireLiveWriteConfirmation(formData);
  const { supabase } = await requireAdmin();
  const liveTvUrl = value(formData, "live_tv_url");
  if (!validUrl(liveTvUrl)) redirect(`${path}?error=invalid_live_tv_url`);
  const { data, error } = await supabase
    .from("app_config")
    .update({ value: liveTvUrl, updated_at: new Date().toISOString() })
    .eq("key", "live_tv_url")
    .select("key")
    .maybeSingle();
  if (error || !data) redirect(`${path}?error=live_tv_save_failed`);
  revalidatePath(path);
  redirect(`${path}?success=live_tv_updated`);
}

export async function createLegacyShow(formData: FormData) {
  requireLiveWriteConfirmation(formData);
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("shows").insert(showPayload(formData));
  if (error) redirect(`${path}?error=show_save_failed`);
  revalidatePath(path); revalidatePath("/dashboard"); redirect(`${path}?success=show_created`);
}

export async function updateLegacyShow(formData: FormData) {
  requireLiveWriteConfirmation(formData);
  const { supabase } = await requireAdmin();
  const id = value(formData, "id");
  if (!id) redirect(`${path}?error=invalid_show`);
  const { error } = await supabase.from("shows").update(showPayload(formData)).eq("id", id);
  if (error) redirect(`${path}?error=show_save_failed`);
  revalidatePath(path); revalidatePath("/dashboard"); redirect(`${path}?success=show_updated`);
}

export async function createLegacyVideo(formData: FormData) {
  requireLiveWriteConfirmation(formData);
  const { supabase } = await requireAdmin();
  const payload = videoPayload(formData);
  const { data: show } = await supabase.from("shows").select("id").eq("id", payload.show_id).maybeSingle();
  if (!show) redirect(`${path}?error=invalid_video`);
  const { error } = await supabase.from("videos").insert(payload);
  if (error) redirect(`${path}?error=video_save_failed`);
  revalidatePath(path); revalidatePath("/dashboard"); redirect(`${path}?success=video_created`);
}

export async function updateLegacyVideo(formData: FormData) {
  requireLiveWriteConfirmation(formData);
  const { supabase } = await requireAdmin();
  const id = value(formData, "id");
  const payload = videoPayload(formData);
  if (!id) redirect(`${path}?error=invalid_video`);
  const { data: show } = await supabase.from("shows").select("id").eq("id", payload.show_id).maybeSingle();
  if (!show) redirect(`${path}?error=invalid_video`);
  const { error } = await supabase.from("videos").update(payload).eq("id", id);
  if (error) redirect(`${path}?error=video_save_failed`);
  revalidatePath(path); revalidatePath("/dashboard"); redirect(`${path}?success=video_updated`);
}
