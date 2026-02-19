import { describe, expect, it } from "vitest";
import {
  type LessonRow,
  type LessonScopePatch,
  type RecurrenceRow,
  stopRecurrence,
  updateLessonScope,
} from "@/server/services/recurrenceService";

function buildLesson(partial: Partial<LessonRow>): LessonRow {
  return {
    id: partial.id ?? "l1",
    owner_id: partial.owner_id ?? "u1",
    recurrence_id: partial.recurrence_id ?? "r1",
    student_id: partial.student_id ?? "s1",
    start_datetime: partial.start_datetime ?? "2026-02-01T10:00:00.000Z",
    end_datetime: partial.end_datetime ?? "2026-02-01T11:00:00.000Z",
    duration_hours: partial.duration_hours ?? 1,
    status: partial.status ?? "YAPILDI",
    no_show_fee_rule: partial.no_show_fee_rule ?? "UCRET_ALINMAZ",
    hourly_rate: partial.hourly_rate ?? 500,
    fee_total: partial.fee_total ?? 500,
    payment_status: partial.payment_status ?? "ODENMEDI",
    amount_paid: partial.amount_paid ?? 0,
    note: partial.note ?? null,
  };
}

function createAdapter(seed: LessonRow[]) {
  const store = new Map(seed.map((lesson) => [lesson.id, { ...lesson }]));

  return {
    adapter: {
      async getLessonById(lessonId: string, userId: string) {
        const lesson = store.get(lessonId);
        if (!lesson || lesson.owner_id !== userId) return null;
        return { ...lesson };
      },
      async getLessonsByRecurrence(recurrenceId: string, userId: string) {
        return [...store.values()]
          .filter((lesson) => lesson.recurrence_id === recurrenceId && lesson.owner_id === userId)
          .sort(
            (a, b) =>
              new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime(),
          )
          .map((lesson) => ({ ...lesson }));
      },
      async updateLesson(lessonId: string, patch: Record<string, unknown>, userId: string) {
        const current = store.get(lessonId);
        if (!current || current.owner_id !== userId) return;
        store.set(lessonId, { ...current, ...(patch as Partial<LessonRow>) });
      },
    },
    getLesson(id: string) {
      return store.get(id);
    },
  };
}

function buildRecurrence(partial: Partial<RecurrenceRow>): RecurrenceRow {
  return {
    id: partial.id ?? "r1",
    owner_id: partial.owner_id ?? "u1",
    student_id: partial.student_id ?? "s1",
    frequency: partial.frequency ?? "WEEKLY",
    interval_weeks: partial.interval_weeks ?? 1,
    weekdays: partial.weekdays ?? [1],
    start_datetime: partial.start_datetime ?? "2026-01-01T10:00:00.000Z",
    end_date: partial.end_date ?? null,
    repeat_count: partial.repeat_count ?? null,
    timezone: partial.timezone ?? "Europe/Istanbul",
  };
}

function createStopAdapter(seedLessons: LessonRow[], seedRecurrences: RecurrenceRow[]) {
  const lessonStore = new Map(seedLessons.map((lesson) => [lesson.id, { ...lesson }]));
  const recurrenceStore = new Map(
    seedRecurrences.map((recurrence) => [recurrence.id, { ...recurrence }]),
  );

  return {
    adapter: {
      async getRecurrenceById(recurrenceId: string, userId: string) {
        const recurrence = recurrenceStore.get(recurrenceId);
        if (!recurrence || recurrence.owner_id !== userId) return null;
        return { ...recurrence };
      },
      async getLessonsByRecurrence(recurrenceId: string, userId: string) {
        return [...lessonStore.values()]
          .filter((lesson) => lesson.recurrence_id === recurrenceId && lesson.owner_id === userId)
          .sort(
            (a, b) =>
              new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime(),
          )
          .map((lesson) => ({ ...lesson }));
      },
      async updateRecurrenceEndDate(recurrenceId: string, endDate: string, userId: string) {
        const recurrence = recurrenceStore.get(recurrenceId);
        if (!recurrence || recurrence.owner_id !== userId) return;
        recurrenceStore.set(recurrenceId, { ...recurrence, end_date: endDate });
      },
      async updateLesson(lessonId: string, patch: Record<string, unknown>, userId: string) {
        const lesson = lessonStore.get(lessonId);
        if (!lesson || lesson.owner_id !== userId) return;
        lessonStore.set(lessonId, { ...lesson, ...(patch as Partial<LessonRow>) });
      },
    },
    getLesson(id: string) {
      return lessonStore.get(id);
    },
    getRecurrence(id: string) {
      return recurrenceStore.get(id);
    },
  };
}

describe("updateLessonScope", () => {
  it("THIS kapsamında yalnızca seçili dersi günceller", async () => {
    const seed = [
      buildLesson({ id: "l1", start_datetime: "2026-02-01T10:00:00.000Z" }),
      buildLesson({ id: "l2", start_datetime: "2026-02-08T10:00:00.000Z" }),
    ];

    const repo = createAdapter(seed);
    const patch: LessonScopePatch = { duration_hours: 2, hourly_rate: 600, status: "YAPILDI" };

    const result = await updateLessonScope("l1", "THIS", patch, "u1", repo.adapter);

    expect(result.scope).toBe("THIS");
    expect(result.updatedCount).toBe(1);
    expect(repo.getLesson("l1")?.duration_hours).toBe(2);
    expect(repo.getLesson("l2")?.duration_hours).toBe(1);
    expect(repo.getLesson("l1")?.fee_total).toBe(1200);
  });

  it("THIS_AND_FUTURE kapsamında seçili tarih ve sonrasını günceller", async () => {
    const seed = [
      buildLesson({ id: "l1", start_datetime: "2026-02-01T10:00:00.000Z" }),
      buildLesson({ id: "l2", start_datetime: "2026-02-08T10:00:00.000Z" }),
      buildLesson({ id: "l3", start_datetime: "2026-02-15T10:00:00.000Z" }),
    ];

    const repo = createAdapter(seed);

    const result = await updateLessonScope(
      "l2",
      "THIS_AND_FUTURE",
      { hourly_rate: 700, duration_hours: 1.5 },
      "u1",
      repo.adapter,
    );

    expect(result.scope).toBe("THIS_AND_FUTURE");
    expect(result.updatedCount).toBe(2);
    expect(repo.getLesson("l1")?.hourly_rate).toBe(500);
    expect(repo.getLesson("l2")?.hourly_rate).toBe(700);
    expect(repo.getLesson("l3")?.hourly_rate).toBe(700);
  });

  it("ALL kapsamında aynı recurrence_id içindeki tüm dersleri günceller", async () => {
    const seed = [
      buildLesson({ id: "l1", recurrence_id: "r1" }),
      buildLesson({ id: "l2", recurrence_id: "r1" }),
      buildLesson({ id: "l3", recurrence_id: "r1" }),
      buildLesson({ id: "x1", recurrence_id: "r2" }),
    ];

    const repo = createAdapter(seed);

    const result = await updateLessonScope(
      "l1",
      "ALL",
      { student_id: "s2", status: "GELMEDI", no_show_fee_rule: "YARIM_UCRET" },
      "u1",
      repo.adapter,
    );

    expect(result.scope).toBe("ALL");
    expect(result.updatedCount).toBe(3);
    expect(repo.getLesson("l1")?.student_id).toBe("s2");
    expect(repo.getLesson("l2")?.student_id).toBe("s2");
    expect(repo.getLesson("l3")?.student_id).toBe("s2");
    expect(repo.getLesson("x1")?.student_id).toBe("s1");
  });

  it("scope != THIS iken datetime patch uygulanmaz ve uyarı döner", async () => {
    const seed = [
      buildLesson({ id: "l1", start_datetime: "2026-02-01T10:00:00.000Z" }),
      buildLesson({ id: "l2", start_datetime: "2026-02-08T10:00:00.000Z" }),
    ];

    const repo = createAdapter(seed);

    const result = await updateLessonScope(
      "l1",
      "ALL",
      {
        start_datetime: "2026-03-01T09:00:00.000Z",
        end_datetime: "2026-03-01T10:00:00.000Z",
        hourly_rate: 800,
      },
      "u1",
      repo.adapter,
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(repo.getLesson("l1")?.start_datetime).toBe("2026-02-01T10:00:00.000Z");
    expect(repo.getLesson("l2")?.start_datetime).toBe("2026-02-08T10:00:00.000Z");
    expect(repo.getLesson("l1")?.hourly_rate).toBe(800);
  });

  it("fee_total güncellemede finance kurallarını korur", async () => {
    const seed = [
      buildLesson({
        id: "l1",
        status: "YAPILDI",
        duration_hours: 2,
        hourly_rate: 500,
        fee_total: 1000,
        payment_status: "ODENDI",
        amount_paid: 1000,
      }),
    ];

    const repo = createAdapter(seed);

    await updateLessonScope(
      "l1",
      "THIS",
      { status: "IPTAL", duration_hours: 2, hourly_rate: 500 },
      "u1",
      repo.adapter,
    );

    expect(repo.getLesson("l1")?.fee_total).toBe(0);
    expect(repo.getLesson("l1")?.amount_paid).toBe(0);
    expect(repo.getLesson("l1")?.payment_status).toBe("ODENDI");
  });
});

describe("stopRecurrence", () => {
  it("NEXT modunda bir sonraki dersten itibaren iptal eder", async () => {
    const lessons = [
      buildLesson({
        id: "p1",
        recurrence_id: "r1",
        start_datetime: "2026-01-10T10:00:00.000Z",
        status: "YAPILDI",
      }),
      buildLesson({
        id: "f1",
        recurrence_id: "r1",
        start_datetime: "2026-02-01T10:00:00.000Z",
        status: "PLANLANDI",
        fee_total: 500,
      }),
      buildLesson({
        id: "f2",
        recurrence_id: "r1",
        start_datetime: "2026-02-08T10:00:00.000Z",
        status: "PLANLANDI",
        fee_total: 500,
      }),
    ];
    const recurrences = [buildRecurrence({ id: "r1" })];
    const repo = createStopAdapter(lessons, recurrences);

    const result = await stopRecurrence(
      "r1",
      "NEXT",
      undefined,
      "u1",
      new Date("2026-01-20T00:00:00.000Z"),
      repo.adapter,
    );

    expect(result.cancelled_count).toBe(2);
    expect(repo.getLesson("p1")?.status).toBe("YAPILDI");
    expect(repo.getLesson("f1")?.status).toBe("IPTAL");
    expect(repo.getLesson("f2")?.status).toBe("IPTAL");
    expect(repo.getLesson("f1")?.fee_total).toBe(0);
    expect(repo.getLesson("f1")?.amount_paid).toBe(0);
    expect(repo.getLesson("f1")?.payment_status).toBe("ODENMEDI");
    expect(repo.getRecurrence("r1")?.end_date).toBe("2026-01-31");
  });

  it("DATE modunda seçili tarihten sonraki dersleri iptal eder", async () => {
    const lessons = [
      buildLesson({
        id: "a1",
        recurrence_id: "r2",
        start_datetime: "2026-02-01T10:00:00.000Z",
        status: "PLANLANDI",
      }),
      buildLesson({
        id: "a2",
        recurrence_id: "r2",
        start_datetime: "2026-02-08T10:00:00.000Z",
        status: "PLANLANDI",
      }),
      buildLesson({
        id: "a3",
        recurrence_id: "r2",
        start_datetime: "2026-02-15T10:00:00.000Z",
        status: "PLANLANDI",
      }),
    ];
    const recurrences = [buildRecurrence({ id: "r2" })];
    const repo = createStopAdapter(lessons, recurrences);

    const result = await stopRecurrence(
      "r2",
      "DATE",
      "2026-02-08",
      "u1",
      new Date("2026-01-20T00:00:00.000Z"),
      repo.adapter,
    );

    expect(result.cancelled_count).toBe(2);
    expect(repo.getLesson("a1")?.status).toBe("PLANLANDI");
    expect(repo.getLesson("a2")?.status).toBe("IPTAL");
    expect(repo.getLesson("a3")?.status).toBe("IPTAL");
    expect(repo.getLesson("a2")?.fee_total).toBe(0);
    expect(repo.getLesson("a2")?.amount_paid).toBe(0);
    expect(repo.getRecurrence("r2")?.end_date).toBe("2026-02-08");
  });
});
