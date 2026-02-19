import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-route";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectUrl = new URL("/panel", requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
