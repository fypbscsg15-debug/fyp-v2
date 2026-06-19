import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type Tone = "primary" | "warning" | "success" | "danger";

const toneStyles: Record<Tone, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-primary-soft", text: "text-primary", ring: "ring-primary/10" },
  warning: { bg: "bg-warning-soft", text: "text-warning", ring: "ring-warning/10" },
  success: { bg: "bg-success-soft", text: "text-success", ring: "ring-success/10" },
  danger: { bg: "bg-severity-high-bg", text: "text-severity-high", ring: "ring-destructive/10" },
};

type Props = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  trend?: ReactNode;
  suffix?: string;
};

export const StatCard = ({ title, value, icon: Icon, tone = "primary", trend, suffix }: Props) => {
  const s = toneStyles[tone];
  return (
    <div className="stat-card group animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
            {suffix && <span className="text-sm font-medium text-muted-foreground">{suffix}</span>}
          </div>
          {trend && <div className="mt-2 text-xs text-muted-foreground">{trend}</div>}
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-105", s.bg, s.ring)}>
          <Icon className={cn("h-6 w-6", s.text)} />
        </div>
      </div>
    </div>
  );
};
