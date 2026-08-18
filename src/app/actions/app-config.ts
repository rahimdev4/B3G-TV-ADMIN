"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { legacyWritesEnabled } from "@/lib/env";

const path = "/dashboard/live-tv";
const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function validHttpsUrl(input: string) {
  try {
    return new URL(input).protocol === "https:";
  } catch {
    return false;
  }
}

export async function updateLiveTvUrl(formData: FormData) {
  if (!legacyWritesEnabled()) redirect(`${path}?error=writes_locked`);
  if (value(formData, "live_confirmation") !== "LIVE") redirect(`${path}?error=confirmation_required`);
  const liveTvUrl = value(formData, "live_tv_url");
  if (!validHttpsUrl(liveTvUrl)) redirect(`${path}?error=invalid_url`);

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("app_config")
    .update({ value: liveTvUrl, updated_at: new Date().toISOString() })
    .eq("key", "live_tv_url")
    .select("key")
    .maybeSingle();

  if (error || !data) redirect(`${path}?error=save_failed`);
  revalidatePath(path);
  revalidatePath("/dashboard/legacy");
  redirect(`${path}?success=updated`);
}
