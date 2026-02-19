import { Clock3, TrendingUp, WalletCards } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyTRY } from "@/lib/format";

type ReportStatsCardsProps = {
  totalLessonHours: number;
  collected: number;
  receivable: number;
};

const items = [
  {
    key: "hours",
    title: "Bu Ay Ders Saati",
    icon: Clock3,
    getValue: (props: ReportStatsCardsProps) => props.totalLessonHours.toFixed(1),
  },
  {
    key: "collected",
    title: "Tahsil Edilen",
    icon: TrendingUp,
    getValue: (props: ReportStatsCardsProps) => formatCurrencyTRY(props.collected),
  },
  {
    key: "receivable",
    title: "Toplam Alacak",
    icon: WalletCards,
    getValue: (props: ReportStatsCardsProps) => formatCurrencyTRY(props.receivable),
  },
];

export function ReportStatsCards(props: ReportStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="overflow-hidden border-0 bg-gradient-to-br from-white to-slate-50">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{item.title}</p>
                <p className="text-2xl font-bold text-slate-900">{item.getValue(props)}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
