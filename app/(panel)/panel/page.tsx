export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/page-header";
import { ReportStatsCards } from "@/components/reports/report-stats-cards";
import { getMonthlyReport } from "@/server/repositories/report-repository";

export default async function PanelPage() {
  const stats = await getMonthlyReport();

  return (
    <section>
      <PageHeader title="Panel" subtitle="Genel görünüm" />
      <ReportStatsCards
        totalLessonHours={stats.totalLessonHours}
        collected={stats.collected}
        receivable={stats.receivable}
      />
    </section>
  );
}
