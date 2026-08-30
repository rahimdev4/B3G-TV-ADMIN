"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { databaseErrorCode } from "@/lib/database-errors";

const path = "/dashboard/import-legacy";
const allRows = "00000000-0000-0000-0000-000000000000";

export async function resetCmsTestData(formData: FormData) {
  if (String(formData.get("confirmation") ?? "").trim() !== "RESET CMS TEST DATA") {
    redirect(`${path}?error=reset_confirmation_required`);
  }

  const { supabase } = await requireAdmin();
  const { count: importedCount, error: importedCheckError } = await supabase
    .from("cms_titles")
    .select("id", { count: "exact", head: true })
    .not("legacy_show_id", "is", null);
  if (importedCheckError) redirect(`${path}?error=${databaseErrorCode(importedCheckError, "reset_failed")}`);
  if ((importedCount ?? 0) > 0) redirect(`${path}?error=imported_content_present`);

  // Dependency-safe order. These are the only tables this action may delete from.
  const tables = [
    "catalog_episodes",
    "catalog_seasons",
    "catalog_titles",
    "catalog_categories",
    "cms_episodes",
    "cms_seasons",
    "cms_titles",
    "cms_categories",
    "cms_media_assets",
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", allRows);
    if (error) redirect(`${path}?error=${databaseErrorCode(error, "reset_failed")}`);
  }

  const { error: rolloutError } = await supabase
    .from("app_config")
    .update({ value: "false" })
    .eq("key", "catalog_v2_enabled");
  if (rolloutError) redirect(`${path}?error=${databaseErrorCode(rolloutError, "reset_failed")}`);

  revalidatePath("/dashboard", "layout");
  redirect(`${path}?success=reset`);
}
