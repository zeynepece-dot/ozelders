import {
  addDays,
  addWeeks,
  format,
  isAfter,
  parseISO,
  subDays,
} from "date-fns";
import { createClient } from "@/lib/supabase/server-route";
import { computeLessonFee, normalizePayment } from "@/server/services/financeService";

export type RecurrenceScope = "THIS" | "THIS_AND_FUTURE" | "ALL";
export type RecurrenceStopMode = "NEXT" | "DATE";

export type RecurrenceInput = {
  start_datetime: string;
  end_datetime: string;
  interval_weeks: number;
  weekdays: number[];
  end_date?: string | null;
  repeat_count?: number | null;
};

export type RecurrenceRow = {
  id: string;
  owner_id: string;
  student_id: string | null;
  frequency: "WEEKLY" | "BIWEEKLY";
  interval_weeks: number;
  weekdays: number[];
  start_datetime: string;
  end_date: string | null;
  repeat_count: number | null;
  timezone: string;
};

export function generateInstances(recurrence: RecurrenceInput) {
  const start = parseISO(recurrence.start_datetime);
  const end = parseISO(recurrence.end_datetime);
  const durationMs = end.getTime() - start.getTime();
  const weekdaySet = new Set(recurrence.weekdays);

  const instances: Array<{ start_datetime: string; end_datetime: string }> = [];
  let cursor = start;
  let generated = 0;

  for (let safety = 0; safety < 520; safety += 1) {
    if (weekdaySet.has(cursor.getDay())) {
      instances.push({
        start_datetime: cursor.toISOString(),
        end_datetime: new Date(cursor.getTime() + durationMs).toISOString(),
      });
      generated += 1;
    }

    if (recurrence.repeat_count && generated >= recurrence.repeat_count) break;
    if (recurrence.end_date && isAfter(cursor, parseISO(recurrence.end_date))) break;

    cursor = weekdaySet.has((cursor.getDay() + 1) % 7)
      ? addDays(cursor, 1)
      : addWeeks(cursor, Math.max(recurrence.interval_weeks, 1));
  }

  return instances;
}

export function applyEditScope(scope: RecurrenceScope) {
  if (scope === "THIS") return { updateCurrentOnly: true, updateFuture: false };
  if (scope === "THIS_AND_FUTURE") return { updateCurrentOnly: false, updateFuture: true };
  return { updateCurrentOnly: false, updateFuture: true, resetPast: true };
}

export type LessonScopePatch = {
  student_id?: string;
  start_datetime?: string;
  end_datetime?: string;
  duration_hours?: number;
  status?: "PLANLANDI" | "YAPILDI" | "GELMEDI" | "IPTAL";
  no_show_fee_rule?: "UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET";
  hourly_rate?: number;
  payment_status?: "ODENDI" | "ODENMEDI" | "KISMI";
  amount_paid?: number;
  note?: string;
};

export type LessonRow = {
  id: string;
  owner_id: string;
  recurrence_id: string | null;
  student_id: string;
  start_datetime: string;
  end_datetime: string;
  duration_hours: number;
  status: "PLANLANDI" | "YAPILDI" | "GELMEDI" | "IPTAL";
  no_show_fee_rule: "UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET";
  hourly_rate: number;
  fee_total: number;
  payment_status: "ODENDI" | "ODENMEDI" | "KISMI";
  amount_paid: number;
  note: string | null;
};

type RecurrenceAdapter = {
  getLessonById: (lessonId: string, userId: string) => Promise<LessonRow | null>;
  getLessonsByRecurrence: (recurrenceId: string, userId: string) => Promise<LessonRow[]>;
  updateLesson: (
    lessonId: string,
    patch: Record<string, unknown>,
    userId: string,
  ) => Promise<void>;
};

type StopRecurrenceAdapter = {
  getRecurrenceById: (
    recurrenceId: string,
    userId: string,
  ) => Promise<RecurrenceRow | null>;
  getLessonsByRecurrence: (
    recurrenceId: string,
    userId: string,
  ) => Promise<LessonRow[]>;
  updateRecurrenceEndDate: (
    recurrenceId: string,
    endDate: string,
    userId: string,
  ) => Promise<void>;
  updateLesson: (
    lessonId: string,
    patch: Record<string, unknown>,
    userId: string,
  ) => Promise<void>;
};

function defaultRecurrenceAdapter(): RecurrenceAdapter {
  const supabase = createClient();

  return {
    async getLessonById(lessonId, userId) {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .eq("owner_id", userId)
        .maybeSingle();

      return (data as LessonRow | null) ?? null;
    },
    async getLessonsByRecurrence(recurrenceId, userId) {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("recurrence_id", recurrenceId)
        .eq("owner_id", userId)
        .order("start_datetime", { ascending: true });

      return (data as LessonRow[] | null) ?? [];
    },
    async updateLesson(lessonId, patch, userId) {
      const { error } = await supabase
        .from("lessons")
        .update(patch)
        .eq("id", lessonId)
        .eq("owner_id", userId);

      if (error) {
        throw new Error("Ders güncellemesi başarısız.");
      }
    },
  };
}

function defaultStopRecurrenceAdapter(): StopRecurrenceAdapter {
  const supabase = createClient();

  return {
    async getRecurrenceById(recurrenceId, userId) {
      const { data } = await supabase
        .from("recurrences")
        .select("*")
        .eq("id", recurrenceId)
        .eq("owner_id", userId)
        .maybeSingle();

      return (data as RecurrenceRow | null) ?? null;
    },
    async getLessonsByRecurrence(recurrenceId, userId) {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("recurrence_id", recurrenceId)
        .eq("owner_id", userId)
        .order("start_datetime", { ascending: true });

      return (data as LessonRow[] | null) ?? [];
    },
    async updateRecurrenceEndDate(recurrenceId, endDate, userId) {
      const { error } = await supabase
        .from("recurrences")
        .update({ end_date: endDate })
        .eq("id", recurrenceId)
        .eq("owner_id", userId);

      if (error) {
        throw new Error("Seri bitiş tarihi güncellenemedi.");
      }
    },
    async updateLesson(lessonId, patch, userId) {
      const { error } = await supabase
        .from("lessons")
        .update(patch)
        .eq("id", lessonId)
        .eq("owner_id", userId);

      if (error) {
        throw new Error("Ders güncellemesi başarısız.");
      }
    },
  };
}

function sanitizeScopePatch(scope: RecurrenceScope, patch: LessonScopePatch) {
  const sanitized: LessonScopePatch = { ...patch };
  const warnings: string[] = [];

  if (scope !== "THIS") {
    if (sanitized.start_datetime || sanitized.end_datetime) {
      warnings.push(
        "Bu ve sonraki derslerde saat/tarih toplu kaydırma bu sürümde desteklenmiyor. Yalnızca ücret/süre/durum gibi alanlar güncellendi.",
      );
    }

    delete sanitized.start_datetime;
    delete sanitized.end_datetime;
    delete sanitized.payment_status;
    delete sanitized.amount_paid;
    delete sanitized.note;
  }

  return { sanitized, warnings };
}

export async function updateLessonScope(
  lessonId: string,
  scope: RecurrenceScope,
  patch: LessonScopePatch,
  userId: string,
  adapter: RecurrenceAdapter = defaultRecurrenceAdapter(),
) {
  const selected = await adapter.getLessonById(lessonId, userId);

  if (!selected) {
    throw new Error("Ders bulunamadı.");
  }

  const effectiveScope: RecurrenceScope = selected.recurrence_id ? scope : "THIS";
  const { sanitized, warnings } = sanitizeScopePatch(effectiveScope, patch);

  let targets: LessonRow[] = [selected];

  if (selected.recurrence_id && effectiveScope !== "THIS") {
    const recurrenceLessons = await adapter.getLessonsByRecurrence(
      selected.recurrence_id,
      userId,
    );
    targets =
      effectiveScope === "ALL"
        ? recurrenceLessons
        : recurrenceLessons.filter(
            (lesson) =>
              new Date(lesson.start_datetime).getTime() >=
              new Date(selected.start_datetime).getTime(),
          );
  }

  for (const lesson of targets) {
    const merged = { ...lesson, ...sanitized };

    const feeTotal = computeLessonFee({
      status: merged.status,
      noShowRule: merged.no_show_fee_rule,
      hourlyRate: Number(merged.hourly_rate),
      durationHours: Number(merged.duration_hours),
    });

    const payment = normalizePayment({
      paymentStatus:
        effectiveScope === "THIS"
          ? merged.payment_status
          : (lesson.payment_status as "ODENDI" | "ODENMEDI" | "KISMI"),
      feeTotal,
      amountPaid:
        effectiveScope === "THIS"
          ? Number(merged.amount_paid)
          : Number(lesson.amount_paid),
    });

    const updatePatch: Record<string, unknown> = {
      ...sanitized,
      fee_total: feeTotal,
      payment_status: payment.paymentStatus,
      amount_paid: payment.amountPaid,
    };

    await adapter.updateLesson(lesson.id, updatePatch, userId);
  }

  return {
    scope: effectiveScope,
    updatedCount: targets.length,
    warnings,
  };
}

export async function stopRecurrence(
  recurrenceId: string,
  stopMode: RecurrenceStopMode,
  stopDate: string | undefined,
  userId: string,
  now: Date = new Date(),
  adapter: StopRecurrenceAdapter = defaultStopRecurrenceAdapter(),
) {
  const recurrence = await adapter.getRecurrenceById(recurrenceId, userId);
  if (!recurrence) {
    throw new Error("Seri bulunamadı.");
  }

  const lessons = await adapter.getLessonsByRecurrence(recurrenceId, userId);
  const futureLessons = lessons.filter(
    (lesson) =>
      lesson.status !== "IPTAL" &&
      new Date(lesson.start_datetime).getTime() >= now.getTime(),
  );

  let stopEffectiveDateTime: Date;
  if (stopMode === "DATE") {
    if (!stopDate) throw new Error("Durdurma tarihi zorunludur.");
    stopEffectiveDateTime = new Date(`${stopDate}T00:00:00+03:00`);
  } else {
    stopEffectiveDateTime = futureLessons[0]
      ? new Date(futureLessons[0].start_datetime)
      : now;
  }

  const recurrenceEndDate =
    stopMode === "DATE" && stopDate
      ? stopDate
      : format(subDays(stopEffectiveDateTime, 1), "yyyy-MM-dd");

  await adapter.updateRecurrenceEndDate(recurrenceId, recurrenceEndDate, userId);

  const lessonsToCancel = lessons.filter(
    (lesson) =>
      lesson.status !== "IPTAL" &&
      new Date(lesson.start_datetime).getTime() >=
        stopEffectiveDateTime.getTime(),
  );

  for (const lesson of lessonsToCancel) {
    await adapter.updateLesson(
      lesson.id,
      {
        status: "IPTAL",
        fee_total: 0,
        amount_paid: 0,
        payment_status: "ODENMEDI",
      },
      userId,
    );
  }

  return {
    cancelled_count: lessonsToCancel.length,
    stop_effective_datetime: stopEffectiveDateTime.toISOString(),
    message: `Seri durduruldu. ${lessonsToCancel.length} ders iptal edildi.`,
  };
}
