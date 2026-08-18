"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export async function archiveMediaAsset(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const [titles, seasons, episodes] = await Promise.all([
    supabase.from("cms_titles").select("id", { count: "exact", head: true }).or(`poster_asset_id.eq.${id},thumbnail_asset_id.eq.${id},trailer_asset_id.eq.${id},video_asset_id.eq.${id}`).is("deleted_at", null),
    supabase.from("cms_seasons").select("id", { count: "exact", head: true }).eq("thumbnail_asset_id", id).is("deleted_at", null),
    supabase.from("cms_episodes").select("id", { count: "exact", head: true }).or(`thumbnail_asset_id.eq.${id},trailer_asset_id.eq.${id},video_asset_id.eq.${id}`).is("deleted_at", null),
  ]);
  if ((titles.count ?? 0) + (seasons.count ?? 0) + (episodes.count ?? 0) > 0) redirect("/dashboard/media?error=asset_in_use");
  const { error } = await supabase.from("cms_media_assets").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null);
  if (error) redirect("/dashboard/media?error=delete_failed");
  revalidatePath("/dashboard/media");
  redirect("/dashboard/media?success=archived");
}
