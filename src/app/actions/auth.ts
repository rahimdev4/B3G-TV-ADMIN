"use server";

import { redirect } from "next/navigation";
import { isAllowedAdmin } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/login?error=missing_fields");
  if (!isAllowedAdmin(email)) redirect("/login?error=unauthorized");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("[admin-auth] Supabase sign-in failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    const code = encodeURIComponent(error.code ?? "unknown_auth_error");
    redirect(`/login?error=auth_failed&code=${code}`);
  }
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
