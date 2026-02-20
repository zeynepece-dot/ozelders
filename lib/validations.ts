import { z } from "zod";

const isoDateString = z.string().datetime({ offset: true, message: "Tarih formatı geçersiz." });

export const authSignInSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin."),
  password: z.string().min(1, "Şifre zorunludur."),
});

export const authSignUpSchema = z
  .object({
    email: z.string().email("Geçerli bir e-posta girin."),
    password: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
    passwordConfirm: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Şifreler aynı değil.",
  });

export const studentCreateSchema = z.object({
  fullName: z.string().min(2, "Ad Soyad zorunludur."),
  subject: z.string().min(1, "Lütfen bir ders seçin veya yazın."),
  hourlyRateDefault: z.number().min(0, "Saat ücreti negatif olamaz."),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Geçerli bir e-posta girin.").optional().or(z.literal("")),
  parentName: z.string().optional().or(z.literal("")),
  parentPhone: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  status: z.enum(["AKTIF", "PASIF"]).default("AKTIF"),
});

export const studentUpdateSchema = studentCreateSchema.partial().extend({
  fullName: z.string().min(2, "Ad Soyad zorunludur.").optional(),
  subject: z.string().min(1, "Lütfen bir ders seçin veya yazın.").optional(),
});

export const studentDetailResponseSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  subject: z.string(),
  hourly_rate_default: z.union([z.number(), z.string()]),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  parent_name: z.string().optional().nullable(),
  parent_phone: z.string().optional().nullable(),
});

export const lessonUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  studentId: z.string().uuid("Öğrenci seçimi zorunludur."),
  startDateTime: isoDateString,
  endDateTime: isoDateString,
  durationHours: z.number().positive("Süre sıfırdan büyük olmalıdır."),
  status: z.enum(["PLANLANDI", "YAPILDI", "GELMEDI", "IPTAL"]),
  noShowFeeRule: z.enum(["UCRET_ALINMAZ", "YARIM_UCRET", "TAM_UCRET"]),
  hourlyRate: z.number().min(0, "Saat ücreti negatif olamaz."),
  paymentStatus: z.enum(["ODENDI", "ODENMEDI", "KISMI"]),
  amountPaid: z.number().min(0, "Ödenen tutar negatif olamaz."),
  note: z.string().optional().or(z.literal("")),
  recurrenceId: z.string().uuid().optional().nullable(),
});

export const lessonScopeApplySchema = z.object({
  scope: z.enum(["THIS", "THIS_AND_FUTURE", "ALL"]),
  patch: z
    .object({
      student_id: z.string().uuid().optional(),
      start_datetime: isoDateString.optional(),
      end_datetime: isoDateString.optional(),
      duration_hours: z.number().positive("Süre sıfırdan büyük olmalıdır.").optional(),
      status: z.enum(["PLANLANDI", "YAPILDI", "GELMEDI", "IPTAL"]).optional(),
      no_show_fee_rule: z.enum(["UCRET_ALINMAZ", "YARIM_UCRET", "TAM_UCRET"]).optional(),
      hourly_rate: z.number().min(0, "Saat ücreti negatif olamaz.").optional(),
      payment_status: z.enum(["ODENDI", "ODENMEDI", "KISMI"]).optional(),
      amount_paid: z.number().min(0, "Ödenen tutar negatif olamaz.").optional(),
      note: z.string().optional(),
    })
    .refine((patch) => Object.keys(patch).length > 0, {
      message: "Güncelleme verisi boş olamaz.",
    }),
});

export const reportRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const isoDateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

export const settingsUpdateSchema = z.object({
  adminEmail: z.string().email("Geçerli bir e-posta girin.").optional().or(z.literal("")),
  overdueDays: z.number().int().min(1, "Gecikme gün sayısı en az 1 olmalıdır.").optional(),
  workdayStart: z.string().regex(timeRegex, "Lütfen geçerli bir saat girin (Örn: 08:30).").optional(),
  workdayEnd: z.string().regex(timeRegex, "Lütfen geçerli bir saat girin (Örn: 08:30).").optional(),
  weekStart: z.union([z.literal(0), z.literal(1)]).optional(),
  hideWeekends: z.boolean().optional(),
  holidays: z
    .array(z.string().regex(isoDateOnlyRegex, "Tatil tarihi geçersiz."))
    .optional(),
  defaultHourlyRate: z
    .number()
    .min(0, "Saatlik ücret 0 veya daha büyük olmalıdır.")
    .optional(),
  defaultNoShowFeeRule: z
    .enum(["UCRET_ALINMAZ", "YARIM_UCRET", "TAM_UCRET"])
    .optional(),
});

export const profileUpsertSchema = z.object({
  full_name: z.string().trim().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
  username: z.string().trim().optional().or(z.literal("")),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre zorunludur."),
  newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalı."),
});

export const calendarNoteSchema = z.object({
  title: z.string().min(2, "Takvim notu başlığı zorunludur."),
  startDateTime: isoDateString,
  endDateTime: isoDateString,
  note: z.string().optional().or(z.literal("")),
});

export const studentNoteCreateSchema = z.object({
  text: z.string().trim().min(2, "Not metni en az 2 karakter olmalıdır."),
});

export const studentNoteUpdateSchema = z.object({
  text: z.string().trim().min(2, "Not metni en az 2 karakter olmalıdır."),
});

export const homeworkCreateSchema = z.object({
  title: z.string().trim().min(2, "Ödev başlığı en az 2 karakter olmalıdır."),
  description: z.string().trim().optional().or(z.literal("")),
  due_date: z.string().regex(isoDateOnlyRegex, "Son tarih geçersiz.").optional().or(z.literal("")),
});

export const homeworkUpdateSchema = z
  .object({
    title: z.string().trim().min(2, "Ödev başlığı en az 2 karakter olmalıdır.").optional(),
    description: z.string().trim().optional().or(z.literal("")),
    due_date: z.string().regex(isoDateOnlyRegex, "Son tarih geçersiz.").optional().or(z.literal("")),
    status: z.enum(["BEKLIYOR", "TAMAMLANDI"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Güncellenecek alan bulunamadı.",
  });

export const homeworkStatusFilterSchema = z.object({
  status: z.enum(["BEKLIYOR", "TAMAMLANDI", "ALL"]).optional(),
});
export const demoSeedSchema = z.object({
  overwrite: z.boolean().optional().default(false),
});

export const weeklyRecurrenceCreateSchema = z.object({
  student_id: z.string().uuid("Öğrenci seçimi zorunludur."),
  weekday: z.number().int().min(0).max(6),
  time: z.string().regex(timeRegex, "Saat formatı geçersiz."),
  duration_hours: z.number().positive("Süre sıfırdan büyük olmalıdır."),
  start_date: z.string().regex(isoDateOnlyRegex, "Başlangıç tarihi geçersiz."),
  end_date: z.string().regex(isoDateOnlyRegex, "Bitiş tarihi geçersiz.").optional(),
  count: z.number().int().positive("Tekrar sayısı pozitif olmalıdır.").optional(),
  hourly_rate: z.number().min(0, "Saat ücreti negatif olamaz.").optional(),
  no_show_fee_rule: z.enum(["UCRET_ALINMAZ", "YARIM_UCRET", "TAM_UCRET"]).optional(),
  note: z.string().optional().or(z.literal("")),
});

export type StudentCreateInput = z.input<typeof studentCreateSchema>;
export type LessonUpsertInput = z.input<typeof lessonUpsertSchema>;



