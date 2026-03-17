import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-route";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/giris?e=dogrulama_basarisiz", requestUrl.origin));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/giris?e=dogrulama_basarisiz", requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/panel", requestUrl.origin));
}
