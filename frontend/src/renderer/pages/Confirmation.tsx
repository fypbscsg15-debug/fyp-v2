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
  const medicines = rx && rx.medicines ? rx.medicines : [];
  const displayId = rx && rx.id ? rx.id.replace("rx_", "").substring(0, 8).toUpperCase() : "—";

  // Calculations
  const subtotal = medicines.reduce((sum: number, m: any) => sum + ((m.quantity_dispensed || 10) * (m.unit_price || 100.0)), 0);
  const tax = subtotal * 0.15; // 15% GST
  const grandTotal = subtotal + tax;

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center py-8 sm:py-12">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            padding: 10px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full text-center no-print animate-fade-in mb-6">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dispensing Complete</h1>
        <p className="mt-1 text-sm text-muted-foreground">The prescription has been verified and dispensed successfully.</p>
      </div>

      {/* Invoice and Receipt Container */}
      <div id="print-area" className="card-elevated w-full p-6 sm:p-8 shadow-elevated border border-border bg-card">
        {/* Receipt Header */}
        <div className="border-b pb-4 mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">SMART PHARMACY RECEIPT</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Dispensed by Smart Pharmacist Support System</p>
          </div>
          <div className="text-right">
            <span className="inline-flex rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success">Paid</span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid gap-3 sm:grid-cols-3 text-sm border-b pb-4 mb-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Prescription ID</p>
            <p className="font-semibold">#{displayId}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Patient</p>
            <p className="font-semibold">{patientName}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Date / Time</p>
            <p className="font-semibold">{new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Medicines Table */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase text-muted-foreground mb-2">Itemized Bill</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
                <tr>
                  <th className="p-3 text-left">Medication</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {medicines.map((m: any) => (
                  <tr key={m.id}>
                    <td className="p-3 font-medium text-foreground">{m.name}</td>
                    <td className="p-3 text-center font-medium">{m.quantity_dispensed || 10}</td>
                    <td className="p-3 text-right text-muted-foreground">Rs. {Number(m.unit_price || 100.0).toFixed(2)}</td>
                    <td className="p-3 text-right font-semibold">Rs. {Number((m.quantity_dispensed || 10) * (m.unit_price || 100.0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Billing Breakdown */}
        <div className="border-t pt-4 space-y-2 text-sm ml-auto max-w-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium text-foreground">Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST / Sales Tax (15%):</span>
            <span className="font-medium text-foreground">Rs. {tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Grand Total:</span>
            <span className="text-primary">Rs. {grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Internal Updates Checklist (no-print) */}
        <div className="no-print mt-6 space-y-1.5 text-xs text-success border-t pt-4">
          <p className="flex items-center gap-2 font-medium">
            <FileText className="h-3.5 w-3.5" /> Instructions printed and shared with patient
          </p>
          <p className="flex items-center gap-2 font-medium">
            <Package className="h-3.5 w-3.5" /> Inventory updated automatically
          </p>
        </div>
      </div>

      {/* Action Buttons (no-print) */}
      <div className="no-print mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print Receipt</Button>
        <Button variant="outline" onClick={() => navigate("/scan")}><Plus className="mr-2 h-4 w-4" /> New Prescription</Button>
        <Button onClick={() => navigate("/")}><Home className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
      </div>
    </div>
  );
};

export default Confirmation;
