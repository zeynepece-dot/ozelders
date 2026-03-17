import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";

export function updateSession(request: NextRequest) {
  const isProtectedRoute = ["/panel", "/ogrenciler", "/takvim", "/raporlar", "/ayarlar"].some(
    (route) =>
      request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`),
  );

  if (!hasSupabaseAuthCookie(request.cookies.getAll()) && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
