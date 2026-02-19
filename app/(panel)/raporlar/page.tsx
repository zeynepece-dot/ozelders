"use client";

import { useMemo, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { ReportStatsCards } from "@/components/reports/report-stats-cards";
import { TopStudentsList } from "@/components/reports/top-students-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EMPTY_MONTHLY_REPORT,
  useMonthlyReport,
} from "@/hooks/useMonthlyReport";

export default function RaporlarPage() {
  const initialFrom = useMemo(
    () => startOfMonth(new Date()).toISOString().slice(0, 10),
    [],
  );
  const initialTo = useMemo(
    () => endOfMonth(new Date()).toISOString().slice(0, 10),
    [],
  );

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [appliedRange, setAppliedRange] = useState({
    from: initialFrom,
    to: initialTo,
  });

  const { data: report = EMPTY_MONTHLY_REPORT } = useMonthlyReport(
    appliedRange.from,
    appliedRange.to,
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Raporlar" subtitle="Tarih aralığına göre özet" />
        <div className="flex items-end gap-2">
          <div>
            <p className="mb-1 text-xs text-slate-500">Başlangıç</p>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-500">Bitiş</p>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => setAppliedRange({ from, to })}>Filtrele</Button>
          <Button asChild variant="outline">
            <a
              href={`/api/reports/csv?from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`}
            >
              CSV İndir
            </a>
          </Button>
        </div>
      </div>

      <ReportStatsCards
        totalLessonHours={report.totalLessonHours}
        collected={report.collected}
        receivable={report.receivable}
      />
      <TopStudentsList students={report.topStudents} />
    </section>
  );
}
