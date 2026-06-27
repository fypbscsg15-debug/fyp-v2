import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";
import { mockAnalytics } from "@/services/mockData";
import { apiEndpoints } from "@/services/api";
import { FileText, AlertTriangle, Clock, TrendingUp, Download, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RANGES = ["Today", "This Week", "This Month", "Custom"] as const;

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--severity-medium))", "hsl(var(--severity-high))", "hsl(var(--success))"];

const Analytics = () => {
  const [range, setRange] = useState<typeof RANGES[number]>("This Week");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [a, setA] = useState<any>(null);

  useEffect(() => {
    if (range === "Custom" && (!startDate || !endDate)) return;
    apiEndpoints.analytics(range, startDate, endDate)
      .then((res) => setA(res.data))
      .catch(() => toast.error("Failed to load analytics"));
  }, [range, startDate, endDate]);

  if (!a && range === "Custom" && (!startDate || !endDate)) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Analytics" description="Operational and clinical performance insights" />
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>{r}</Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              className="flex h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm border-zinc-200 dark:border-zinc-800"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              className="flex h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm border-zinc-200 dark:border-zinc-800"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="p-8 text-center text-muted-foreground card-elevated">Select a date range above to view precise analytics</div>
      </div>
    );
  }

  if (!a) {
    return <div className="p-8 text-center text-muted-foreground">Loading Analytics...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Analytics"
        description="Operational and clinical performance insights"
        actions={
          <>
            <Button variant="outline" onClick={() => toast.success("Exported as PDF")}><Download className="mr-2 h-4 w-4" /> PDF</Button>
            <Button variant="outline" onClick={() => toast.success("Exported as CSV")}><FileSpreadsheet className="mr-2 h-4 w-4" /> CSV</Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>{r}</Button>
          ))}
        </div>
        {range === "Custom" && (
          <div className="flex flex-wrap items-center gap-2 animate-fade-in">
            <input
              type="date"
              className="flex h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm border-zinc-200 dark:border-zinc-800"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              className="flex h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm border-zinc-200 dark:border-zinc-800"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Prescriptions Processed" value={a.totalPrescriptions.toLocaleString()} icon={FileText} tone="primary" />
        <StatCard title="Errors Detected" value={a.totalErrors} icon={AlertTriangle} tone="danger" />
        <StatCard title="Avg Verification Time" value={a.avgVerificationTime} suffix="sec" icon={Clock} tone="warning" />
        <StatCard title={`Top Alert: ${a.topAlert.name}`} value={a.topAlert.percent} suffix="%" icon={TrendingUp} tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Prescription Volume" subtitle="Daily volume vs. target (50/day)">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={a.volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <ReferenceLine y={50} stroke="hsl(var(--severity-medium))" strokeDasharray="4 4" label={{ value: "Target", position: "right", fontSize: 10 }} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Error Detection Accuracy" subtitle="% accuracy vs. target (95%)">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={a.accuracyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[85, 100]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <ReferenceLine y={95} stroke="hsl(var(--success))" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Alert Types Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={a.alertTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
                {a.alertTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Verification Time" subtitle="Avg seconds per prescription (target: 3s)">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={a.verificationTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <ReferenceLine y={3} stroke="hsl(var(--severity-medium))" strokeDasharray="4 4" />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className={cn("card-elevated p-5")}>
    <div className="mb-3">
      <h3 className="font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
    <div className="h-[250px] w-full">{children}</div>
  </div>
);

export default Analytics;
