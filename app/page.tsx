import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";

export default async function HomePage() {
  const hasAuthCookie = hasSupabaseAuthCookie(cookies().getAll());

  if (hasAuthCookie) redirect("/panel");
  redirect("/giris");
}
