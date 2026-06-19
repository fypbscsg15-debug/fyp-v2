import { cn } from "@/lib/utils";
import { Severity } from "@/services/mockData";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

const map: Record<Severity, { label: string; cls: string; Icon: any }> = {
  high: { label: "HIGH", cls: "bg-severity-high-bg text-severity-high border-severity-high-border", Icon: AlertTriangle },
  medium: { label: "MEDIUM", cls: "bg-severity-medium-bg text-severity-medium border-severity-medium-border", Icon: AlertCircle },
  low: { label: "LOW", cls: "bg-severity-low-bg text-severity-low border-severity-low-border", Icon: Info },
};

export const SeverityBadge = ({ severity, className }: { severity: Severity; className?: string }) => {
  const { label, cls, Icon } = map[severity];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold", cls, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};
