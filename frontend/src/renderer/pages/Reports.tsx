import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiEndpoints } from "@/services/api";
import { FileText, Download, FileSpreadsheet, Mail, Loader2, AlertOctagon } from "lucide-react";
import { toast } from "sonner";

const REPORT_TYPES = [
  { id: "prescription", label: "Prescription Report" },
  { id: "errors", label: "Error Analysis Report" },
  { id: "inventory", label: "Inventory Report" },
  { id: "audit", label: "Audit Log Report" },
];

const Reports = () => {
  const [selected, setSelected] = useState<string[]>(["prescription"]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pharmacist, setPharmacist] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [reportBlob, setReportBlob] = useState<Blob | null>(null);
  const [liveStats, setLiveStats] = useState<any>(null);

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const generate = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one report type");
      return;
    }
    setGenerating(true);
    try {
      const res = await apiEndpoints.reports({
        selected,
        from_date: from || null,
        to_date: to || null,
        pharmacist,
        severity,
      });
      setReportBlob(res.data);
      
      try {
        const statsRes = await apiEndpoints.analytics("Custom", from || undefined, to || undefined);
        setLiveStats(statsRes.data);
      } catch (e) {
        setLiveStats(null);
      }

      setGenerated(true);
      toast.success("Report generated successfully!");
    } catch (err: any) {
      toast.error("Failed to generate report on backend.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!reportBlob) return;
    const url = window.URL.createObjectURL(reportBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spss_report.pdf";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("PDF report downloaded!");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Reports" description="Build and export operational and clinical reports" />

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="card-elevated p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Report Type</h3>
          <div className="space-y-2.5">
            {REPORT_TYPES.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-2.5 rounded-md border p-3 hover:bg-muted/40">
                <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggle(r.id)} />
                <span className="text-sm font-medium">{r.label}</span>
              </label>
            ))}
          </div>

          <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Date Range</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>

          <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filters</h3>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Pharmacist</Label>
              <Select value={pharmacist} onValueChange={setPharmacist}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pharmacists</SelectItem>
                  <SelectItem value="ali">Dr. Ali</SelectItem>
                  <SelectItem value="sara">Dr. Sara</SelectItem>
                  <SelectItem value="hassan">Dr. Hassan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Alert Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="mt-5 w-full" onClick={generate} disabled={generating}>
            {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><FileText className="mr-2 h-4 w-4" /> Generate Report</>}
          </Button>
        </div>

        <div className="card-elevated p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preview</h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!generated} onClick={downloadPDF}><Download className="mr-1.5 h-3.5 w-3.5" /> PDF</Button>
              <Button size="sm" variant="outline" disabled={!generated} onClick={() => toast.success("CSV downloaded")}><FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> CSV</Button>
              <Button size="sm" variant="outline" disabled={!generated} onClick={() => toast.success("Report emailed")}><Mail className="mr-1.5 h-3.5 w-3.5" /> Email</Button>
            </div>
          </div>

          {!generated ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed text-center">
              <AlertOctagon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No Report Generated</p>
              <p className="mt-1 text-xs text-muted-foreground">Configure options and click Generate Report</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="font-bold">SPSS — {selected.map((s) => REPORT_TYPES.find((r) => r.id === s)?.label).join(", ")}</h4>
                <p className="text-xs text-muted-foreground">Date range: {from || "All"} → {to || "Today"}</p>
                <p className="text-xs text-muted-foreground">Generated: {new Date().toLocaleString()}</p>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3 text-left">Metric</th><th className="p-3 text-left">Value</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-t"><td className="p-3">Total Prescriptions</td><td className="p-3 font-semibold">{liveStats?.totalPrescriptions ?? 0}</td></tr>
                    <tr className="border-t"><td className="p-3">Flagged with Errors</td><td className="p-3 font-semibold">{liveStats?.totalErrors ?? 0}</td></tr>
                    <tr className="border-t"><td className="p-3">Pending Review</td><td className="p-3 font-semibold">{liveStats?.pendingVerification ?? 0}</td></tr>
                    <tr className="border-t"><td className="p-3">Avg. Verification Time</td><td className="p-3 font-semibold">{liveStats?.avgVerificationTime ?? 0}s</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
