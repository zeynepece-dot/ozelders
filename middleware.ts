import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/giris",
    "/auth/callback",
    "/auth/reset",
    "/panel/:path*",
    "/ogrenciler/:path*",
    "/takvim/:path*",
    "/raporlar/:path*",
    "/ayarlar/:path*",
  ],
};
