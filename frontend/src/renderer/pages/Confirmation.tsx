import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer, Plus, Home, FileText, Package } from "lucide-react";
import { apiEndpoints } from "@/services/api";
import { toast } from "sonner";

const Confirmation = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [rx, setRx] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const fetchPromise = (id === "rx_1023" || id === "rx_ocr" || id === "latest")
        ? apiEndpoints.getLatestPrescription()
        : apiEndpoints.getPrescription(id);

      fetchPromise
        .then((res) => {
          setRx(res.data);
        })
        .catch(() => {
          toast.error("Failed to fetch prescription details.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading details...</p>
      </div>
    );
  }

  const patientName = rx ? rx.patientName : "Unknown Patient";
  const medicinesCount = rx && rx.medicines ? rx.medicines.length : 0;
  const displayId = rx && rx.id ? rx.id.replace("rx_", "").substring(0, 8).toUpperCase() : "—";

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-8 sm:py-16">
      <div className="card-elevated w-full p-8 text-center shadow-elevated animate-fade-in">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="h-12 w-12 text-success" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dispensing Complete</h1>
        <p className="mt-2 text-sm text-muted-foreground">The prescription has been verified and dispensed successfully.</p>

        <div className="mt-6 grid gap-3 rounded-xl border bg-muted/30 p-5 text-left sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Prescription ID</p>
            <p className="font-semibold">#{displayId}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Patient</p>
            <p className="font-semibold">{patientName}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Medicines Dispensed</p>
            <p className="font-semibold">{medicinesCount} items</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Date / Time</p>
            <p className="font-semibold">{new Date().toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-5 space-y-1.5 text-sm">
          <p className="flex items-center justify-center gap-2 text-success">
            <FileText className="h-4 w-4" /> Instructions printed and shared with patient
          </p>
          <p className="flex items-center justify-center gap-2 text-success">
            <Package className="h-4 w-4" /> Inventory updated
          </p>
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print Receipt</Button>
          <Button variant="outline" onClick={() => navigate("/scan")}><Plus className="mr-2 h-4 w-4" /> New Prescription</Button>
          <Button onClick={() => navigate("/")}><Home className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
