import { Button } from "@/components/ui/button";
import { SeverityBadge } from "./SeverityBadge";
import { SafetyAlert } from "@/services/mockData";
import { cn } from "@/lib/utils";
import { BookOpen, Shield, Check } from "lucide-react";

const borderClass: Record<SafetyAlert["severity"], string> = {
  high: "border-l-4 border-l-severity-high",
  medium: "border-l-4 border-l-severity-medium",
  low: "border-l-4 border-l-severity-low",
};

type Props = {
  alert: SafetyAlert;
  onOverride?: (a: SafetyAlert) => void;
  onResolve?: (a: SafetyAlert) => void;
};

export const AlertCard = ({ alert, onOverride, onResolve }: Props) => {
  return (
    <div className={cn("card-elevated p-4 animate-fade-in", borderClass[alert.severity])}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <SeverityBadge severity={alert.severity} />
          <div className="min-w-0">
            <h4 className="font-semibold text-foreground">{alert.title}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              <span className="font-medium">Reference:</span> {alert.reference}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onOverride?.(alert)}>
          <Shield className="mr-1.5 h-3.5 w-3.5" /> Override
        </Button>
        <Button size="sm" onClick={() => onResolve?.(alert)}>
          <Check className="mr-1.5 h-3.5 w-3.5" /> Resolve
        </Button>
      </div>
    </div>
  );
};
