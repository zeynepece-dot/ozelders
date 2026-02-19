import { createClient } from "@/lib/supabase/server-readonly";
import { computeStudentBalance } from "@/server/services/financeService";

export async function listStudentsWithBalance() {
  const supabase = createClient();

  const { data: students, error } = await supabase
    .from("students")
    .select("id,full_name,phone,subject,hourly_rate_default,status")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Öğrenciler listelenemedi.");
  }

  const rows = await Promise.all(
    (students ?? []).map(async (student) => {
      const balance = await computeStudentBalance(student.id);
      return {
        id: student.id,
        fullName: student.full_name,
        phone: student.phone,
        subject: student.subject,
        hourlyRateDefault: Number(student.hourly_rate_default),
        status: student.status,
        balance: {
          totalFee: balance.totalFee,
          totalPaid: balance.totalPaid,
          remainingDebt: balance.balance,
        },
      };
    }),
  );

  return rows;
}

