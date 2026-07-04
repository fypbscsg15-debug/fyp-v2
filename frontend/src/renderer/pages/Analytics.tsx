import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
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

  const todayStr = new Date().toLocaleDateString("en-CA");

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
              max={todayStr}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              className="flex h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm border-zinc-200 dark:border-zinc-800"
              value={endDate}
              max={todayStr}
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

  const handleDownloadPDF = () => {
    if (!a) return;
    toast.info("Generating PDF...");

    const doc = new jsPDF("p", "mm", "a4");

    // Title section
    doc.setFont("helvetica", "normal");
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235); // Blue
    doc.text("Operational Performance Report", 20, 25);

    // Subtitle / Date range info
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    const rangeText = range === "Custom" ? `Custom` : `${range}`;
    doc.text(`Report Period: ${rangeText} | Generated on: ${new Date().toLocaleDateString()}`, 20, 32);

    // Divider line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(20, 36, 190, 36);

    // 1. Summary Metrics
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text("Summary Metrics", 20, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600
    
    let metricsY = 56;
    doc.text(`Prescriptions Processed: ${a.totalPrescriptions}`, 20, metricsY);
    metricsY += 7;
    doc.text(`Errors Detected: ${a.totalErrors}`, 20, metricsY);
    metricsY += 7;
    doc.text(`Average Verification Time: ${a.avgVerificationTime} seconds`, 20, metricsY);
    metricsY += 7;
    doc.text(`Top Alert Type: ${a.topAlert.name} (${a.topAlert.percent}%)`, 20, metricsY);

    // 2. Alert Distribution
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text("Alert Distribution", 20, metricsY + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);

    let alertY = metricsY + 24;
    const interactionCount = a.alertTypes.find((t: any) => t.name === "Drug Interactions")?.value ?? 0;
    const dosageCount = a.alertTypes.find((t: any) => t.name === "Dosage Errors")?.value ?? 0;
    const contraCount = a.alertTypes.find((t: any) => t.name === "Contraindications")?.value ?? 0;
    const duplicateCount = a.alertTypes.find((t: any) => t.name === "Duplicates")?.value ?? 0;

    doc.text(`Drug Interactions: ${interactionCount} alerts`, 20, alertY);
    alertY += 7;
    doc.text(`Dosage Errors: ${dosageCount} alerts`, 20, alertY);
    alertY += 7;
    doc.text(`Contraindications: ${contraCount} alerts`, 20, alertY);
    alertY += 7;
    doc.text(`Duplicates: ${duplicateCount} alerts`, 20, alertY);

    // 3. Detailed Performance Data
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text("Detailed Performance Data", 20, alertY + 16);

    // Table
    const tableY = alertY + 22;
    // Table Headers
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Interval/Day", 20, tableY);
    doc.text("Volume", 70, tableY);
    doc.text("Accuracy", 115, tableY);
    doc.text("Avg Time (s)", 160, tableY);

    // Header underline
    doc.setDrawColor(226, 232, 240);
    doc.line(20, tableY + 3, 190, tableY + 3);

    // Table rows
    let rowY = tableY + 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    const dailyData = a.volumeData || [];
    dailyData.forEach((row: any, i: number) => {
      const accuracyVal = a.accuracyData[i]?.value ?? 100;
      const verifVal = a.verificationTime[i]?.value ?? 0;

      doc.text(row.day, 20, rowY);
      doc.text(row.value.toString(), 70, rowY);
      doc.text(`${accuracyVal}%`, 115, rowY);
      doc.text(`${verifVal.toFixed(1)}s`, 160, rowY);
      
      rowY += 7;
    });

    doc.save("spss_analytics_report.pdf");
    toast.success("PDF report generated!");
  };

  return (
    <div className="mx-auto max-w-7xl print-area">
      <PageHeader
        title="Analytics"
        description="Operational and clinical performance insights"
        actions={
          <div className="no-print">
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 no-print">
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
              max={todayStr}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              className="flex h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm border-zinc-200 dark:border-zinc-800"
              value={endDate}
              max={todayStr}
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
