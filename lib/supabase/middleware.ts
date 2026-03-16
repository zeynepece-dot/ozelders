import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const hasAuthCookie = hasSupabaseAuthCookie(request.cookies.getAll());

  const pathname = request.nextUrl.pathname;
  const isPublicRoute =
    pathname.startsWith("/giris") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/reset");
  const isAuthRoute = pathname.startsWith("/giris");
  const isProtectedRoute = ["/panel", "/ogrenciler", "/takvim", "/raporlar", "/ayarlar"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!hasAuthCookie && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    return NextResponse.redirect(url);
  }

  if (hasAuthCookie && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    return NextResponse.redirect(url);
  }

  if (!hasAuthCookie && isPublicRoute) {
    return response;
  }

  return response;
}
