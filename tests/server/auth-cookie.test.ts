import { describe, expect, it } from "vitest";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";

describe("hasSupabaseAuthCookie", () => {
  it("returns true for Supabase auth cookies", () => {
    expect(
      hasSupabaseAuthCookie([
        { name: "sb-project-auth-token" },
        { name: "other-cookie" },
      ]),
    ).toBe(true);
  });

  it("returns true for secure chunked Supabase auth cookies", () => {
    expect(
      hasSupabaseAuthCookie([
        { name: "__Secure-sb-project-auth-token.0" },
      ]),
    ).toBe(true);
  });

  it("returns false when only unrelated cookies exist", () => {
    expect(hasSupabaseAuthCookie([{ name: "next-locale" }])).toBe(false);
  });
});
