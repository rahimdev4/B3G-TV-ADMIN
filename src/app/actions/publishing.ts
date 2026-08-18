"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { cloudflareServerEnv } from "@/lib/env";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const publishingPath = "/dashboard/publishing";

async function syncAssignedStreamMedia(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], titleId:string) {
  const [{data:title},{data:episodes}]=await Promise.all([
    supabase.from("cms_titles").select("trailer_asset_id,video_asset_id").eq("id",titleId).maybeSingle(),
    supabase.from("cms_episodes").select("trailer_asset_id,video_asset_id").eq("show_id",titleId).is("deleted_at",null),
  ]);
  const ids=[title?.trailer_asset_id,title?.video_asset_id,...(episodes ?? []).flatMap((item)=>[item.trailer_asset_id,item.video_asset_id])].filter((id):id is string=>Boolean(id));
  if(!ids.length) return;
  const {data:assets}=await supabase.from("cms_media_assets").select("id,provider_id,public_url,thumbnail_url").in("id",[...new Set(ids)]).in("kind",["video","trailer"]);
  const env=cloudflareServerEnv();
  await Promise.all((assets ?? []).map(async(asset)=>{
    const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.accountId}/stream/${asset.provider_id}`,{headers:{Authorization:`Bearer ${env.apiToken}`},cache:"no-store"});
    const body=await response.json() as {success?:boolean;result?:{readyToStream?:boolean;duration?:number;size?:number;thumbnail?:string;playback?:{hls?:string};status?:{state?:string}}};
    if(!response.ok || !body.success || !body.result) return;
    const result=body.result;
    await supabase.from("cms_media_assets").update({status:result.readyToStream ? "ready" : result.status?.state === "error" ? "failed" : "processing",public_url:result.playback?.hls ?? asset.public_url,thumbnail_url:result.thumbnail ?? asset.thumbnail_url,duration_sec:result.duration == null ? null : Math.round(result.duration),size_bytes:result.size ?? null}).eq("id",asset.id);
  }));
}

export async function publishTitle(formData: FormData) {
  const id=value(formData,"id"), path=publishingPath;
  if (!id || value(formData,"publish_confirmation") !== "PUBLISH") redirect(`${path}?error=publish_confirmation`);
  const { supabase } = await requireAdmin();
  await syncAssignedStreamMedia(supabase,id);
  const { error } = await supabase.rpc("cms_publish_title", { p_title_id:id });
  if (error) {
    const message=error.message.toLowerCase();
    const code=message.includes("assigned title media") ? "media_not_ready" : message.includes("main video") ? "main_video_required" : message.includes("must be ready") ? "title_not_ready" : "publish_failed";
    redirect(`${path}?error=${code}`);
  }
  const {data:source}=await supabase.from("cms_titles").select("is_featured").eq("id",id).single();
  const {error:featuredError}=await supabase.from("catalog_titles").update({is_featured:source?.is_featured ?? false}).eq("id",id);
  if(featuredError) redirect(`${path}?error=publish_failed`);
  revalidatePath(path); redirect(`${path}?success=published`);
}

export async function unpublishTitle(formData: FormData) {
  const id=value(formData,"id"), path=publishingPath;
  if (!id || value(formData,"publish_confirmation") !== "UNPUBLISH") redirect(`${path}?error=unpublish_confirmation`);
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("cms_unpublish_title", { p_title_id:id });
  if (error) redirect(`${path}?error=unpublish_failed`);
  revalidatePath(path); redirect(`${path}?success=unpublished`);
}
