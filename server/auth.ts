import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server-readonly";

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris");
  }

  return user;
}

