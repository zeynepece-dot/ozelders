import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-route";

function resolveNextPath(nextParam: string | null) {
  if (!nextParam) return "/panel";
  if (!nextParam.startsWith("/")) return "/panel";
  return nextParam;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = resolveNextPath(request.nextUrl.searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/giris?e=dogrulama_linki_hatali", request.url));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });

  if (error) {
    return NextResponse.redirect(new URL("/giris?e=dogrulama_linki_hatali", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
