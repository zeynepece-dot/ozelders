# Özel Ders Yönetim Paneli

Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres + Auth) ile hazırlanmış, tek öğretmen kullanımına uygun yönetim paneli.

## Teknoloji Kararları

- Docker kullanılmaz.
- Veritabanı ve kimlik doğrulama: Supabase
- Takvim: FullCalendar React (`timeGridDay` varsayılan)
- Form ve doğrulama: `react-hook-form` + `zod`
- Servis katmanı: `server/services`

## 1) Supabase Projesi Açma

1. https://supabase.com üzerinden yeni proje oluşturun.
2. Proje açıldıktan sonra `Project Settings > API` ekranına gidin.
3. Şu değerleri alın:
   - `Project URL`
   - `anon public` key
   - `service_role` key

## 2) Ortam Değişkenleri

1. `.env.example` dosyasını `.env` olarak kopyalayın.
2. Aşağıdaki alanları doldurun:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- `SUPABASE_SERVICE_ROLE_KEY` sadece server tarafında kullanılır.
- Bu anahtarı client kodunda kullanmayın.

## Şifre Sıfırlama Redirect Ayarı

Supabase Dashboard > Authentication > URL Configuration:

- `Site URL`: production domaininiz (ve localhost)
- `Redirect URLs` içine ekleyin:
  - `http://localhost:3000/auth/reset`
  - `https://<domain>/auth/reset`

Bu ayar yapılmazsa şifre sıfırlama linki doğru sayfaya dönmeyebilir.

## 3) SQL Migration Çalıştırma (Supabase SQL Editor)

1. Supabase panelinde `SQL Editor` açın.
2. `supabase/migrations/001_init.sql` içeriğini kopyalayıp çalıştırın.
3. Bu migration şunları kurar:
   - Enumlar
   - Tablolar: `students`, `lessons`, `recurrences`, `student_notes`, `homework`, `calendar_notes`, `settings`
   - `owner_id` alanları
   - RLS ve owner policy’leri

## 4) RLS Politikaları

Migration içinde tüm tablolarda RLS aktif edilir ve şu kural uygulanır:

- `owner_id = auth.uid()` olan kayıtlar okunur/yazılır.

Bu sayede tek kullanıcı modelinde bile hesap izolasyonu güvenli kalır.

## 5) Uygulamayı Çalıştırma

```bash
npm install
npm run dev
```

Uygulama: `http://localhost:3000`

## 6) İlk Kullanım Akışı

1. `/giris` ekranına gidin.
2. Sistemde hesap yoksa “İlk Kurulum” ile kayıt olun.
3. Sonraki girişlerde sadece giriş ekranı kullanılır.
4. `Ayarlar` sayfasından `Demo Veri Yükle` butonuna basarak örnek veri ekleyin.

## Production Notu (Gecikme)

- Vercel Functions region'i, Supabase projenize en yakın bölge olacak şekilde seçilmelidir:
  `Project Settings -> Functions Region`
- Referans: https://vercel.com/docs/functions/configuring-functions/region

## Özellikler

- Türkçe arayüz
- Güvenli giriş (Supabase Auth)
- Öğrenci CRUD
- Takvim (Gün/Hafta/Ay, günlük görünüm varsayılan)
- Ders finans kuralları (gelmedi/iptal/ödeme durumu)
- Raporlar (tarih filtreli özet + top öğrenciler + CSV)
- Öğrenci notları ve ödev görüntüleme
- Demo veri yükleme

## Servis Katmanı

- `server/services/financeService.ts`
  - `computeLessonFee`
  - `normalizePayment`
  - `computeStudentBalance`
- `server/services/recurrenceService.ts`
  - `generateInstances`
  - `applyEditScope`
