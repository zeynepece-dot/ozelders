import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";
import { createClient } from "@/lib/supabase/server-readonly";

export async function requireUser() {
  if (!hasSupabaseAuthCookie(cookies().getAll())) {
    redirect("/giris");
  }

  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/giris");
  }

  return user;
}
