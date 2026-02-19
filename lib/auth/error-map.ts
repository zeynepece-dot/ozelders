export function mapSupabaseAuthError(message?: string | null) {
  if (!message) return "Bir hata oluştu. Lütfen tekrar deneyin.";

  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }

  if (normalized.includes("user already registered")) {
    return "Bu e-posta ile zaten bir hesap var.";
  }

  if (normalized.includes("password should be at least")) {
    return "Şifre en az 8 karakter olmalıdır.";
  }

  return "Bir hata oluştu. Lütfen tekrar deneyin.";
}

export function mapSupabaseResetRequestError(message?: string | null) {
  if (!message) return "Bağlantı gönderilemedi. Lütfen tekrar deneyin.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid email") ||
    normalized.includes("unable to validate email address")
  ) {
    return "Geçerli bir e-posta girin.";
  }

  return "Bağlantı gönderilemedi. Lütfen tekrar deneyin.";
}

export function mapSupabaseResetApplyError(message?: string | null) {
  if (!message) return "Bağlantı geçersiz veya süresi dolmuş. Lütfen tekrar şifre sıfırlama iste.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("auth session missing") ||
    normalized.includes("expired") ||
    normalized.includes("invalid")
  ) {
    return "Bağlantı geçersiz veya süresi dolmuş. Lütfen tekrar şifre sıfırlama iste.";
  }

  return "Bağlantı geçersiz veya süresi dolmuş. Lütfen tekrar şifre sıfırlama iste.";
}
