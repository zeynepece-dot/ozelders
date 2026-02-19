import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyTRY } from "@/lib/format";

type StudentRow = {
  id: string;
  fullName: string;
  phone: string | null;
  subject: string;
  hourlyRateDefault: string | number;
  status: "AKTIF" | "PASIF";
  balance: {
    remainingDebt: number;
  };
};

export function StudentsTable({ students }: { students: StudentRow[] }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Ad</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Ders</th>
              <th className="px-4 py-3">Saat Ücreti</th>
              <th className="px-4 py-3">Kalan Borç</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <Link className="hover:text-teal-700" href={`/ogrenciler/${student.id}`}>
                    {student.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{student.phone ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{student.subject}</td>
                <td className="px-4 py-3 text-slate-600">{formatCurrencyTRY(Number(student.hourlyRateDefault))}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{formatCurrencyTRY(student.balance.remainingDebt)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${student.status === "AKTIF" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                    {student.status === "AKTIF" ? "Aktif" : "Pasif"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
