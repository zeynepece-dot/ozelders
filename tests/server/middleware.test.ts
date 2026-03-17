import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function makeRequest(pathname: string, cookieHeader?: string) {
  return new NextRequest(`https://example.com${pathname}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

describe("updateSession", () => {
  it("redirects unauthenticated protected requests to /giris", () => {
    const response = updateSession(makeRequest("/panel"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/giris");
  });

  it("allows protected requests with a Supabase auth cookie", () => {
    const response = updateSession(
      makeRequest("/panel", "sb-project-auth-token=token"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not redirect public routes even without auth cookies", () => {
    const response = updateSession(makeRequest("/giris"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
