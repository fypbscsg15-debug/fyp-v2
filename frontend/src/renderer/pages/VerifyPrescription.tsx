import { useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCard } from "@/components/common/AlertCard";
import { AlertCategory, SafetyAlert } from "@/services/mockData";
import { toast } from "sonner";
import { CheckCheck, FileText } from "lucide-react";

const VerifyPrescription = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const stateAlerts: SafetyAlert[] = (location.state as any)?.alerts ?? [];
  const medicines: string[] = (location.state as any)?.medicines ?? [];
  const isRealData = stateAlerts.length > 0 || medicines.length > 0;

  const [alerts, setAlerts] = useState<SafetyAlert[]>(stateAlerts);
  const [tab, setTab] = useState<"all" | AlertCategory>("all");

  const counts = useMemo(() => ({
    total: alerts.length,
    high: alerts.filter((a) => a.severity === "high").length,
    medium: alerts.filter((a) => a.severity === "medium").length,
    low: alerts.filter((a) => a.severity === "low").length,
  }), [alerts]);

  const filtered = tab === "all" ? alerts : alerts.filter((a) => a.category === tab);

  const resolveOne = (alertId: string) => {
    setAlerts((p) => p.filter((a) => a.id !== alertId));
    toast.success("Alert resolved");
  };

  const resolveAll = () => {
    setAlerts([]);
    toast.success("All alerts resolved");
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Safety Alerts"
        description={
          medicines.length > 0
            ? `Drug interaction check for: ${medicines.join(", ")}`
            : `Clinical decision support results for prescription ${id}`
        }
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/instructions/${id}`, { state: location.state })}>
              <FileText className="mr-2 h-4 w-4" /> Generate Instructions
            </Button>
            <Button onClick={resolveAll} disabled={alerts.length === 0}>
              <CheckCheck className="mr-2 h-4 w-4" /> Resolve All
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className="card-elevated p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Total Alerts</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{counts.total}</p>
        </div>
        <div className="card-elevated border-l-4 border-l-severity-high p-4">
          <p className="text-xs font-medium uppercase text-severity-high">High Risk</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{counts.high}</p>
        </div>
        <div className="card-elevated border-l-4 border-l-severity-medium p-4">
          <p className="text-xs font-medium uppercase text-severity-medium">Medium Risk</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{counts.medium}</p>
        </div>
        <div className="card-elevated border-l-4 border-l-severity-low p-4">
          <p className="text-xs font-medium uppercase text-severity-low">Low Risk</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{counts.low}</p>
        </div>
      </div>

      {isRealData && alerts.length === 0 && (
        <div className="card-elevated mb-4 flex items-center gap-3 rounded-lg border-l-4 border-l-success bg-success/5 p-4">
          <CheckCheck className="h-5 w-5 text-success" />
          <p className="text-sm font-medium text-success">
            No drug interactions detected among the {medicines.length} checked medicines.
          </p>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="flex w-full flex-wrap justify-start overflow-x-auto">
          <TabsTrigger value="all">All Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="interaction">Drug Interactions</TabsTrigger>
          <TabsTrigger value="dosage">Dosage Errors</TabsTrigger>
          <TabsTrigger value="contraindication">Contraindications</TabsTrigger>
          <TabsTrigger value="duplicate">Duplicates</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="card-elevated flex flex-col items-center justify-center p-10 text-center">
              <CheckCheck className="mb-3 h-10 w-10 text-success" />
              <h3 className="text-lg font-semibold">No alerts in this category</h3>
              <p className="mt-1 text-sm text-muted-foreground">This prescription is clear to dispense.</p>
              <Button className="mt-4" onClick={() => navigate(`/instructions/${id}`, { state: location.state })}>
                Continue to Instructions
              </Button>
            </div>
          ) : (
            filtered.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                onViewDetails={() => toast.info(a.title)}
                onOverride={() => { resolveOne(a.id); toast.warning("Override logged in audit trail"); }}
                onResolve={() => resolveOne(a.id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VerifyPrescription;
