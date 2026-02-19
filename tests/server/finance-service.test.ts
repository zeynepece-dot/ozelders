import { describe, expect, it } from "vitest";
import { computeLessonFee, normalizePayment } from "@/server/services/financeService";

describe("computeLessonFee", () => {
  it("yapıldı ders için tam ücret hesaplar", () => {
    const result = computeLessonFee({
      status: "YAPILDI",
      noShowRule: "UCRET_ALINMAZ",
      hourlyRate: 400,
      durationHours: 2,
    });

    expect(result).toBe(800);
  });

  it("gelmedi + yarım ücret kuralında yarım ücret hesaplar", () => {
    const result = computeLessonFee({
      status: "GELMEDI",
      noShowRule: "YARIM_UCRET",
      hourlyRate: 500,
      durationHours: 2,
    });

    expect(result).toBe(500);
  });

  it("iptal ders için sıfır döner", () => {
    const result = computeLessonFee({
      status: "IPTAL",
      noShowRule: "TAM_UCRET",
      hourlyRate: 600,
      durationHours: 1,
    });

    expect(result).toBe(0);
  });
});

describe("normalizePayment", () => {
  it("ödendi durumunda tutarı feeTotal yapar", () => {
    const result = normalizePayment({ paymentStatus: "ODENDI", feeTotal: 1200, amountPaid: 1 });
    expect(result.amountPaid).toBe(1200);
  });

  it("ödenmedi durumunda tutarı sıfırlar", () => {
    const result = normalizePayment({ paymentStatus: "ODENMEDI", feeTotal: 1200, amountPaid: 1000 });
    expect(result.amountPaid).toBe(0);
  });

  it("kısmi durumda tutarı 0 ile feeTotal arasında normalize eder", () => {
    const result = normalizePayment({ paymentStatus: "KISMI", feeTotal: 1000, amountPaid: 1250 });
    expect(result.amountPaid).toBe(1000);
  });
});
