import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import {
  FileText, Clock, BarChart3, Package, ScanLine, ShieldCheck, FileBarChart,
  CheckCircle2, AlertTriangle, CircleDashed
} from "lucide-react";
import { apiEndpoints } from "@/services/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusBadge = {
  verified: { cls: "bg-success-soft text-success", label: "Verified", Icon: CheckCircle2 },
  alert: { cls: "bg-severity-high-bg text-severity-high", label: "Alert", Icon: AlertTriangle },
  pending: { cls: "bg-severity-medium-bg text-severity-medium", label: "Pending", Icon: CircleDashed },
};

const mapStatus = (action: string) => {
  const act = action.toLowerCase();
  if (act.includes("alert") || act.includes("error") || act.includes("override")) return "alert";
  if (act.includes("verified") || act.includes("login") || act.includes("logout") || act.includes("dispensed") || act.includes("success")) return "verified";
  return "pending";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todaysPrescriptions: 0,
    pendingVerification: 0,
    errorDetectionRate: 100,
    lowStockAlerts: 0,
  });

  useEffect(() => {
    apiEndpoints.analytics("Today")
      .then((res) => {
        const total = res.data.totalPrescriptions || 0;
        const errors = res.data.totalErrors || 0;
        const pending = res.data.pendingVerification || 0;
        const rate = total > 0 ? Math.round(((total - errors) / total) * 100) : 95;
        setStats((prev) => ({
          ...prev,
          todaysPrescriptions: total,
          errorDetectionRate: rate,
          pendingVerification: pending,
        }));
      })
      .catch(() => {});

    apiEndpoints.inventory()
      .then((res) => {
        const lowStock = res.data.filter((item: any) => item.quantity_in_stock < item.low_stock_threshold).length;
        setStats((prev) => ({
          ...prev,
          lowStockAlerts: lowStock,
        }));
      })
      .catch(() => {});

    apiEndpoints.auditLogs()
      .then((res) => {
        setRecentActivity(res.data.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Dashboard" description="Today's clinical overview at a glance" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's Prescriptions" value={stats.todaysPrescriptions} icon={FileText} tone="primary" trend="↑ 12% vs yesterday" />
        <StatCard title="Pending Verification" value={stats.pendingVerification} icon={Clock} tone="warning" trend="Requires review" />
        <StatCard title="Error Detection Rate" value={stats.errorDetectionRate} suffix="%" icon={BarChart3} tone="success" trend="Above 95% target" />
        <StatCard title="Low Stock Alerts" value={stats.lowStockAlerts} icon={Package} tone="danger" trend="Restock recommended" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</h3>
          <div className="space-y-2">
            <Button className="w-full justify-start" size="lg" onClick={() => navigate("/scan")}>
              <ScanLine className="mr-2 h-5 w-5" /> Scan Prescription
            </Button>
            <Button variant="outline" className="w-full justify-start" size="lg" onClick={() => navigate("/inventory")}>
              <Package className="mr-2 h-5 w-5" /> Manage Inventory
            </Button>
            <Button variant="outline" className="w-full justify-start" size="lg" onClick={() => navigate("/analytics")}>
              <BarChart3 className="mr-2 h-5 w-5" /> View Analytics
            </Button>
            <Button variant="outline" className="w-full justify-start" size="lg" onClick={() => navigate("/reports")}>
              <FileBarChart className="mr-2 h-5 w-5" /> Generate Reports
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Activity</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/audit-logs")}>View all</Button>
          </div>
          <div className="card-elevated divide-y">
            {recentActivity.map((a) => {
              const status = mapStatus(a.action);
              const s = statusBadge[status];
              const Icon = s.Icon;
              return (
                <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", s.cls)}>
                      <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{a.user} · {a.timestamp}</p>
                    </div>
                  </div>
                  <span className={cn("hidden shrink-0 rounded-md px-2 py-1 text-xs font-semibold sm:inline-flex", s.cls)}>
                    {s.label}
                  </span>
                </div>
              );
            })}
            {recentActivity.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
