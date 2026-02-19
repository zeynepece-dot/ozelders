import { PageHeader } from "@/components/layout/page-header";
import { CalendarBoard } from "@/components/calendar/calendar-board";

export default function TakvimPage() {
  return (
    <section>
      <PageHeader title="Takvim" subtitle="Gün görünümü varsayılan" />
      <CalendarBoard />
    </section>
  );
}
