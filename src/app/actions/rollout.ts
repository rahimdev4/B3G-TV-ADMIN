"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { legacyWritesEnabled } from "@/lib/env";
const path="/dashboard/catalog-rollout";
export async function setCatalogV2(formData:FormData) {
  if (!legacyWritesEnabled()) redirect(`${path}?error=writes_locked`);
  const enabled=String(formData.get("enabled")) === "true";
  if (String(formData.get("confirmation") ?? "").trim() !== (enabled ? "ENABLE V2" : "DISABLE V2")) redirect(`${path}?error=confirmation`);
  const {supabase}=await requireAdmin();
  const {error}=await supabase.from("app_config").update({value:String(enabled),updated_at:new Date().toISOString()}).eq("key","catalog_v2_enabled");
  if(error) redirect(`${path}?error=save_failed`);
  revalidatePath(path); redirect(`${path}?success=${enabled ? "enabled" : "disabled"}`);
}
