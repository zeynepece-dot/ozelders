# Supabase Email Templates

## Confirm Signup Template

Supabase Dashboard yolu:

- `Authentication -> Email Templates -> Confirm signup`

Template içindeki doğrulama linkini aşağıdaki formatla değiştirin:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  E-postamı doğrula
</a>
```

Not:

- Bu SSR akışında `token_hash`, uygulamadaki `app/auth/confirm/route.ts` içinde
  `verifyOtp` ile doğrulanır ve oturuma çevrilir.
