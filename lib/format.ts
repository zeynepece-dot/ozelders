import { format } from "date-fns";
import { tr } from "date-fns/locale";

export function formatCurrencyTRY(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateTR(date: Date | string) {
  return format(new Date(date), "dd.MM.yyyy", { locale: tr });
}

export function formatDateTimeTR(date: Date | string) {
  return format(new Date(date), "dd.MM.yyyy HH:mm", { locale: tr });
}

export function formatTimeTR(date: Date | string) {
  return format(new Date(date), "HH:mm", { locale: tr });
}
