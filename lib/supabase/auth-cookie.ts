type CookieLike = {
  name: string;
};

export function hasSupabaseAuthCookie(cookies: CookieLike[]) {
  return cookies.some(({ name }) => {
    const normalizedName = name.toLowerCase();
    return (
      normalizedName.includes("auth-token") &&
      (normalizedName.startsWith("sb-") || normalizedName.startsWith("__secure-sb-"))
    );
  });
}
