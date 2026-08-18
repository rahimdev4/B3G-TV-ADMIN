"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { toSlug } from "@/lib/slug";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function categoryPayload(formData: FormData) {
  const name = text(formData, "name");
  const slug = toSlug(text(formData, "slug") || name);
  const description = text(formData, "description") || null;
  const sortOrder = Number.parseInt(text(formData, "sort_order") || "0", 10);
  if (!name || !slug) redirect("/dashboard/categories?error=invalid_category");
  return { name, slug, description, sort_order: Number.isFinite(sortOrder) ? sortOrder : 0 };
}

export async function createCategory(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("cms_categories").insert(categoryPayload(formData));
  if (error) redirect(`/dashboard/categories?error=${error.code === "23505" ? "duplicate_slug" : "save_failed"}`);
  revalidatePath("/dashboard/categories");
  redirect("/dashboard/categories?success=created");
}

export async function updateCategory(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) redirect("/dashboard/categories?error=invalid_category");
  const { error } = await supabase.from("cms_categories").update(categoryPayload(formData)).eq("id", id).is("deleted_at", null);
  if (error) redirect(`/dashboard/categories?error=${error.code === "23505" ? "duplicate_slug" : "save_failed"}`);
  revalidatePath("/dashboard/categories");
  redirect("/dashboard/categories?success=updated");
}

export async function toggleCategory(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  const isActive = text(formData, "is_active") === "true";
  const { error } = await supabase.from("cms_categories").update({ is_active: !isActive }).eq("id", id).is("deleted_at", null);
  if (error) redirect("/dashboard/categories?error=save_failed");
  revalidatePath("/dashboard/categories");
}

export async function archiveCategory(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  const { count } = await supabase.from("cms_titles").select("id", { count: "exact", head: true }).eq("category_id", id).is("deleted_at", null);
  if ((count ?? 0) > 0) redirect("/dashboard/categories?error=category_in_use");
  const { error } = await supabase.from("cms_categories").update({ deleted_at: new Date().toISOString(), is_active: false }).eq("id", id).is("deleted_at", null);
  if (error) redirect("/dashboard/categories?error=delete_failed");
  revalidatePath("/dashboard/categories");
  redirect("/dashboard/categories?success=archived");
}
