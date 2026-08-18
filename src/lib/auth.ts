import { redirect } from "next/navigation";
import { isAllowedAdmin } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !isAllowedAdmin(user.email)) {
    redirect("/login?error=unauthorized");
  }
  return { supabase, user };
}
