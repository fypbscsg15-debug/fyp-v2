import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download } from "lucide-react";
import { apiEndpoints } from "@/services/api";
import { toast } from "sonner";

const PER_PAGE = 20;

const AuditLog = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState("all");
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiEndpoints.auditLogs()
      .then((res) => {
        setLogs(res.data);
      })
      .catch(() => {
        toast.error("Failed to load audit logs");
      });
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (query && !`${l.action} ${l.user} ${l.prescriptionId} ${l.details}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (user !== "all" && l.user !== user) return false;
      if (action !== "all" && l.action !== action) return false;
      return true;
    });
  }, [logs, query, user, action]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  const users = Array.from(new Set(logs.map((l) => l.user)));
  const actions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Audit Log"
        description="Complete history of system activity for compliance and review"
        actions={<Button variant="outline" onClick={() => toast.success("Audit log exported")}><Download className="mr-2 h-4 w-4" /> Export Logs</Button>}
      />

      <div className="card-elevated p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search keywords..." className="pl-9" />
          </div>
          <Select value={user} onValueChange={(v) => { setUser(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="User" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left font-semibold">Timestamp</th>
                <th className="p-3 text-left font-semibold">User</th>
                <th className="p-3 text-left font-semibold">Action</th>
                <th className="p-3 text-left font-semibold">Prescription ID</th>
                <th className="p-3 text-left font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((l) => (
                <tr key={l.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{l.timestamp}</td>
                  <td className="p-3 font-medium">{l.user}</td>
                  <td className="p-3">{l.action}</td>
                  <td className="p-3 text-xs font-mono text-muted-foreground">{l.prescriptionId}</td>
                  <td className="p-3 text-xs text-muted-foreground">{l.details}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">No matching log entries</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Showing {(page - 1) * PER_PAGE + 1} to {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} records
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
