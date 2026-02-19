import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/shared/logout-button";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

export function PageHeader({
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div>
        <h1 className={cn("text-3xl font-bold text-slate-900", titleClassName)}>{title}</h1>
        {subtitle ? (
          <p className={cn("mt-1 text-sm text-slate-500", subtitleClassName)}>{subtitle}</p>
        ) : null}
      </div>
      <LogoutButton className="hidden md:inline-flex" />
    </div>
  );
}
