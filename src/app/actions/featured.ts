"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
export async function toggleFeaturedTitle(formData:FormData) {
  const id=String(formData.get("id") ?? "").trim(); const featured=String(formData.get("is_featured")) !== "true";
  if(!id) redirect("/dashboard/featured?error=invalid_title");
  const {supabase}=await requireAdmin(); const {error}=await supabase.from("cms_titles").update({is_featured:featured}).eq("id",id).is("deleted_at",null);
  if(error) redirect("/dashboard/featured?error=save_failed");
  const {error:catalogError}=await supabase.from("catalog_titles").update({is_featured:featured}).eq("id",id).eq("is_published",true);
  if(catalogError) redirect("/dashboard/featured?error=save_failed");
  revalidatePath("/dashboard/featured"); redirect(`/dashboard/featured?success=${featured ? "featured" : "removed"}`);
}
