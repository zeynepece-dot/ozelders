import { PageHeader } from "@/components/layout/page-header";
import { CalendarBoard } from "@/components/calendar/calendar-board";

export default function TakvimPage() {
  return (
    <section>
      <PageHeader
        title="Takvim"
        subtitle="Gün görünümü varsayýlan"
        className="mb-4 md:mb-6"
        titleClassName="text-3xl md:text-5xl"
        subtitleClassName="text-sm md:text-base"
      />
      <CalendarBoard />
    </section>
  );
}
