import { PageHeader } from "@/components/layout/page-header";
import { CalendarBoard } from "@/components/calendar/calendar-board";

type TakvimPageProps = {
  searchParams?: {
    date?: string;
  };
};

function normalizeDateParam(value: string | undefined) {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default function TakvimPage({ searchParams }: TakvimPageProps) {
  const initialDate = normalizeDateParam(searchParams?.date);

  return (
    <section>
      <PageHeader
        title="Takvim"
        subtitle="Gün görünümü varsayılan"
        className="mb-4 md:mb-6"
        titleClassName="text-3xl md:text-5xl"
        subtitleClassName="text-sm md:text-base"
      />
      <CalendarBoard initialDate={initialDate} />
    </section>
  );
}

