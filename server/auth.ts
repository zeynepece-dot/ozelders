import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";
import { createClient } from "@/lib/supabase/server-readonly";

export async function getAuthenticatedUser() {
  if (!hasSupabaseAuthCookie(cookies().getAll())) {
    return null;
  }

  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/giris");
  }

  return user;
}

export async function redirectAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/panel");
  }
}
