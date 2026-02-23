"use client";

import { useMemo, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { ReportStatsCards } from "@/components/reports/report-stats-cards";
import { TopStudentsList } from "@/components/reports/top-students-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="flex max-w-full flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageHeader title="Raporlar" subtitle="Tarih aralığına göre özet" />

        <div className="flex max-w-full min-w-0 flex-col gap-3 md:flex-row md:items-end md:gap-4">
          <div className="grid grid-cols-2 gap-3 md:flex md:flex-1 md:gap-4">
            <div className="min-w-0">
              <Label htmlFor="report-from-date">Başlangıç</Label>
              <Input
                id="report-from-date"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="min-w-0">
              <Label htmlFor="report-to-date">Bitiş</Label>
              <Input
                id="report-to-date"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3 md:flex md:w-auto md:gap-3">
            <Button className="w-full md:w-auto" onClick={() => setAppliedRange({ from, to })}>
              Filtrele
            </Button>
            <Button asChild variant="outline" className="w-full md:w-auto">
              <a
                className="w-full"
                href={`/api/reports/csv?from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`}
              >
                CSV İndir
              </a>
            </Button>
          </div>
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
