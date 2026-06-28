import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ShieldCheck, ScanLine, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { apiEndpoints } from "@/services/api";

type OcrLine = { text: string; confidence: number };

type Medicine = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
};

// ── OCR parser ────────────────────────────────────────────────────────────────

// Dosage: standard units + tsp/tbsp + (tsp)N OCR artifact
const DOSE_RX    = /(?:\(tsp\)\s*(\d+(?:\.\d+)?))|(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g\b|iu|units?|tabs?(?:let)?s?|caps?(?:ule)?s?|tsp|tbsp)/i;
// Frequency: abbreviations, written, Indian 1-0-1 notation
const FREQ_RX    = /\b(od|bd|tds|qds|qid|tid|bid|prn|sos|stat|once\s+daily|twice\s+daily|thrice\s+daily|\d+\s*(?:times?|x)\s*(?:a\s*)?(?:day|daily|\/day)|every\s+\d+\s*h(?:ours?)?|\d+\s*-\s*\d+\s*-\s*\d+)\b/i;
const DUR_RX     = /\b(\d+)\s*(days?|weeks?|months?)\b/i;
// Numbered medicine header: "1. TAB - CROCIN 500 MG" or "2. SYP. BENADRYL"
const MED_NUM_RX = /^\s*\d+\s*[.)]\s*(TAB(?:LET)?S?\.?|SYP(?:RUP)?\.?|CAP(?:SULE)?S?\.?|INJ(?:ECTION)?\.?|DROPS?\.?|CREAM\.?|GEL\.?|OINT(?:MENT)?\.?|SYR\.?|SUSP(?:ENSION)?\.?|SACHET?\.?)\s*[-.]?\s*/i;
// "ID: 14 - Demo patient (m) 31 y"
const PT_LINE_RX = /(?:ID|No\.?|#)\s*[:\-.]?\s*\d+\s*-\s*([A-Za-z][A-Za-z\s]+?)\s*\(([mfMF])\)\s*(\d+)\s*y/i;
const NAME_RX    = /(?:patient|name|pt\.?)\s*[:\-]?\s*([A-Za-z][A-Za-z\s]{2,30})/i;
const AGE_RX     = /\b(?:age|yrs?|years?)\s*[:\-]?\s*(\d{1,3})\b|\b(\d{1,3})\s*(?:yrs?|years?)\b/i;
const GENDER_RX  = /\b(male|female)\b/i;

/** Fix common OCR letter-O-for-zero misreads */
function fixOcr(t: string): string {
  return t
    .replace(/\b([1-9])OO\b/g, (_, d) => `${d}00`)
    .replace(/\b5OO\b/g, "500")
    .replace(/(\d)O(\d)/g, "$10$2");
}

function cleanName(raw: string): string {
  return raw.replace(/[^a-zA-Z\s\-]/g, " ").replace(/\s+/g, " ").trim();
}

/** Extract dosage from a line; handles both "500mg" and "(tsp)1" OCR artifact */
function extractDose(line: string): { dosage: string; idx: number } | null {
  const m = line.match(DOSE_RX);
  if (!m) return null;
  const value = m[1] ?? m[2];
  const unit  = m[1] ? "tsp" : m[3];
  return { dosage: `${value} ${unit}`, idx: m.index ?? 0 };
}

/**
 * Pull a standalone number (1-365) from a garbled line like "o> 10" or "0s 5".
 * Used as last-resort duration when DUR_RX finds nothing.
 */
function garbledDuration(t: string): string {
  const nums = t.replace(/[^0-9\s]/g, " ").trim().match(/\b(\d{1,3})\b/g);
  if (nums && nums.length === 1) {
    const n = parseInt(nums[0], 10);
    if (n >= 1 && n <= 365) return `${n} days`;
  }
  return "";
}

function parsePrescription(lines: OcrLine[]) {
  const raw   = lines.map(l => l.text.trim()).filter(Boolean);
  const texts = raw.map(fixOcr);

  // ── Patient info ──
  let patientName   = "";
  let patientAge    = "";
  let patientGender = "";

  for (const t of texts) {
    // Structured "ID: N - Name (m) Age y" line takes priority
    const pm = t.match(PT_LINE_RX);
    if (pm) {
      if (!patientName)   patientName   = pm[1].trim();
      if (!patientGender) patientGender = pm[2].toLowerCase() === "m" ? "Male" : "Female";
      if (!patientAge)    patientAge    = pm[3].trim();
      continue;
    }
    if (!patientName)   { const m = t.match(NAME_RX);   if (m) patientName   = m[1].trim(); }
    if (!patientAge)    { const m = t.match(AGE_RX);    if (m) patientAge    = (m[1] ?? m[2]).trim(); }
    if (!patientGender) { const m = t.match(GENDER_RX); if (m) patientGender = m[1].toLowerCase() === "male" ? "Male" : "Female"; }
  }

  const medicines: Medicine[] = [];
  const coveredLines = new Set<number>();

  // ── Pass 1: numbered medicine headers (most reliable) ──
  for (let i = 0; i < texts.length; i++) {
    if (!MED_NUM_RX.test(texts[i])) continue;
    coveredLines.add(i);

    // Strip "1. TAB - " prefix → get rest of header ("CROCIN 500 MG")
    const headerRest = texts[i].replace(/^\s*\d+\s*[.)]\s*/, "").replace(MED_NUM_RX, "").trim();
    const doseInfo   = extractDose(headerRest);
    let drugName     = doseInfo ? cleanName(headerRest.substring(0, doseInfo.idx)) : cleanName(headerRest);
    let dosage       = doseInfo?.dosage ?? "";

    // No dosage on header line → scan next 3 lines
    if (!dosage) {
      for (let j = i + 1; j < Math.min(i + 4, texts.length); j++) {
        if (MED_NUM_RX.test(texts[j])) break;
        const d = extractDose(texts[j]);
        if (d) { dosage = d.dosage; coveredLines.add(j); break; }
      }
    }

    // Frequency: next 5 lines
    let frequency = "";
    for (let j = i + 1; j < Math.min(i + 6, texts.length); j++) {
      if (MED_NUM_RX.test(texts[j])) break;
      const fm = texts[j].match(FREQ_RX);
      if (fm) { frequency = fm[0]; coveredLines.add(j); break; }
    }

    // Duration: next 6 lines; fall back to garbled number
    let duration = "";
    for (let j = i + 1; j < Math.min(i + 7, texts.length); j++) {
      if (MED_NUM_RX.test(texts[j])) break;
      const dm = texts[j].match(DUR_RX);
      if (dm) { duration = dm[0]; coveredLines.add(j); break; }
    }
    if (!duration) {
      for (let j = i + 1; j < Math.min(i + 7, texts.length); j++) {
        if (MED_NUM_RX.test(texts[j])) break;
        const gd = garbledDuration(texts[j]);
        if (gd) { duration = gd; break; }
      }
    }

    medicines.push({ id: `ocr_n${i}`, name: drugName || headerRest, dosage, frequency, duration });
  }

  // ── Pass 2: dosage-anchored detection for uncovered lines ──
  const nameUsed = new Set<number>();
  for (let i = 0; i < texts.length; i++) {
    if (coveredLines.has(i)) continue;
    const line     = texts[i];
    const doseInfo = extractDose(line);
    if (!doseInfo) continue;

    const { dosage, idx: doseStart } = doseInfo;
    let drugName = cleanName(line.substring(0, doseStart));

    if (drugName.length < 2) {
      for (let k = i - 1; k >= Math.max(0, i - 2); k--) {
        if (!nameUsed.has(k) && !coveredLines.has(k) && !extractDose(texts[k])) {
          const c = cleanName(texts[k]);
          if (c.length > 1) { drugName = c; nameUsed.add(k); break; }
        }
      }
    }
    if (drugName.length < 2) drugName = cleanName(line.replace(DOSE_RX, ""));

    let frequency = "";
    const afterDose = line.substring(doseStart + dosage.length);
    const freqHere  = afterDose.match(FREQ_RX);
    if (freqHere) {
      frequency = freqHere[0];
    } else {
      for (let j = i + 1; j < Math.min(i + 4, texts.length); j++) {
        const fm = texts[j].match(FREQ_RX);
        if (fm) { frequency = texts[j]; break; }
      }
    }

    let duration = "";
    const durHere = line.match(DUR_RX);
    if (durHere) {
      duration = durHere[0];
    } else {
      for (let j = i + 1; j < Math.min(i + 5, texts.length); j++) {
        const dm = texts[j].match(DUR_RX);
        if (dm) { duration = dm[0]; break; }
      }
      if (!duration) {
        for (let j = i + 1; j < Math.min(i + 5, texts.length); j++) {
          const gd = garbledDuration(texts[j]);
          if (gd) { duration = gd; break; }
        }
      }
    }

    medicines.push({ id: `ocr_d${i}`, name: drugName || line, dosage, frequency, duration });
  }

  return { patientName, patientAge, patientGender, medicines };
}

// ── Component ─────────────────────────────────────────────────────────────────

const OCRReview = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const sessionData = useMemo(() => {
    if (location.state && (location.state as any).ocrResults) {
      sessionStorage.setItem("spss_scan_session", JSON.stringify(location.state));
      return location.state as any;
    }
    const raw = sessionStorage.getItem("spss_scan_session");
    return raw ? JSON.parse(raw) : null;
  }, [location.state]);

  const ocrLines: OcrLine[] = sessionData?.ocrResults ?? [];
  const imageUrl: string    = sessionData?.imageUrl ?? "/placeholder.svg";
  const isRealData          = ocrLines.length > 0;

  const avgConfidence = isRealData
    ? Math.round((ocrLines.reduce((s, l) => s + l.confidence, 0) / ocrLines.length) * 100)
    : 0;

  const savedForm = useMemo(() => {
    const raw = sessionStorage.getItem("spss_review_form");
    return raw ? JSON.parse(raw) : null;
  }, []);

  const [verifying, setVerifying] = useState(false);
  const [name,   setName]   = useState(savedForm?.name ?? "");
  const [age,    setAge]    = useState(savedForm?.age ?? "");
  const [gender, setGender] = useState(savedForm?.gender ?? "Male");
  const [meds, setMeds] = useState<Medicine[]>(savedForm?.meds ?? [
    { id: "m1", name: "", dosage: "", frequency: "", duration: "" },
  ]);

  useEffect(() => {
    if (isRealData || name || age || meds.some(m => m.name)) {
      sessionStorage.setItem("spss_review_form", JSON.stringify({ name, age, gender, meds }));
    }
  }, [name, age, gender, meds, isRealData]);

  const handleAutoFill = () => {
    if (!isRealData) { toast.warning("No OCR data available. Upload a prescription first."); return; }
    const parsed = parsePrescription(ocrLines);

    if (parsed.patientName) setName(parsed.patientName);
    if (parsed.patientAge)  setAge(parsed.patientAge);
    if (parsed.patientGender) setGender(parsed.patientGender);

    if (parsed.medicines.length > 0) {
      setMeds(parsed.medicines);
      toast.success(`Auto-filled ${parsed.medicines.length} medicine${parsed.medicines.length > 1 ? "s" : ""} — review and correct if needed.`);
    } else {
      toast.info("No medicines detected automatically. Fill in manually.");
    }
  };

  const updateMed = (idx: number, field: keyof Medicine, value: string) => {
    setMeds((p) => p.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const addRow = () =>
    setMeds((p) => [...p, { id: `new_${Date.now()}`, name: "", dosage: "", frequency: "", duration: "" }]);

  const removeRow = (idx: number) => setMeds((p) => p.filter((_, i) => i !== idx));
  const handleConfirm = async () => {
    const activeMeds = meds.filter((m) => m.name.trim() !== "");
    const drugNames = activeMeds.map((m) => m.name);
    const dosages = activeMeds.map((m) => m.dosage || "");
    const frequencies = activeMeds.map((m) => m.frequency || "");
    const durations = activeMeds.map((m) => m.duration || "");

    if (drugNames.length < 1) {
      toast.warning("Enter at least 1 medicine name to run safety checks.");
      return;
    }
    setVerifying(true);
    try {
      const res = await apiEndpoints.verifyPrescription(
        drugNames,
        name,
        age,
        gender,
        dosages,
        frequencies,
        durations
      );
      toast.success("Safety check complete");
      sessionStorage.removeItem("spss_scan_session");
      sessionStorage.removeItem("spss_review_form");
      const rxId = res.data.prescription_id || "rx_ocr";
      navigate(`/verify/${rxId}`, {
        state: {
          alerts: res.data.alerts,
          medicines: drugNames,
          patientName: name,
          patientAge: age,
          patientGender: gender,
          medications: activeMeds.map((m) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration
          }))
        }
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Verification failed. Is the backend running?");
    } finally {
      setVerifying(false);
    }
  };
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="OCR Extraction Review"
        description="Verify extracted data before running clinical safety checks"
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="outline" onClick={() => {
              sessionStorage.removeItem("spss_scan_session");
              sessionStorage.removeItem("spss_review_form");
              navigate("/scan");
            }}>
              <ScanLine className="mr-2 h-4 w-4" /> Rescan
            </Button>
            <Button variant="outline" onClick={handleAutoFill} disabled={!isRealData}>
              <Wand2 className="mr-2 h-4 w-4" /> Auto-fill
            </Button>
            <Button onClick={handleConfirm} disabled={verifying}>
              {verifying
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</>
                : <><ShieldCheck className="mr-2 h-4 w-4" /> Confirm & Verify</>}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left — image + extracted text lines */}
        <div className="card-elevated p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Original Prescription
          </p>
          <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-muted">
            <img src={imageUrl} alt="Prescription" className="max-h-[300px] object-contain" />
          </div>

          {isRealData && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Extracted Text Lines ({ocrLines.length})
              </p>
              <div className="max-h-[280px] overflow-y-auto rounded-lg border divide-y text-sm">
                {ocrLines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="flex-1 break-words">{line.text}</span>
                    <Badge
                      variant={line.confidence >= 0.85 ? "default" : "secondary"}
                      className="shrink-0 text-xs"
                    >
                      {Math.round(line.confidence * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {!isRealData && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No OCR data — upload a prescription from the Scan page.
            </p>
          )}
        </div>

        {/* Right — structured form */}
        <div className="card-elevated p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Structured Data
            </p>
            {isRealData && (
              <Button size="sm" variant="ghost" onClick={handleAutoFill} className="h-7 gap-1 text-xs text-primary">
                <Wand2 className="h-3.5 w-3.5" /> Auto-fill from OCR
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pname">Patient Name</Label>
              <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter patient name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="page">Age</Label>
              <Input id="page" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 42" />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Medicines
              </p>
              <Button size="sm" variant="outline" onClick={addRow}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Medicine
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left font-semibold">Medicine</th>
                    <th className="p-2 text-left font-semibold">Dosage</th>
                    <th className="p-2 text-left font-semibold">Frequency</th>
                    <th className="p-2 text-left font-semibold">Duration</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {meds.map((m, i) => (
                    <tr key={m.id} className="border-t">
                      <td className="p-1.5">
                        <Input value={m.name} onChange={(e) => updateMed(i, "name", e.target.value)} className="h-8" placeholder="Drug name" />
                      </td>
                      <td className="p-1.5">
                        <Input value={m.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} className="h-8 w-24" placeholder="500mg" />
                      </td>
                      <td className="p-1.5">
                        <Input value={m.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} className="h-8" placeholder="3x/day" />
                      </td>
                      <td className="p-1.5">
                        <Input value={m.duration} onChange={(e) => updateMed(i, "duration", e.target.value)} className="h-8 w-24" placeholder="7 days" />
                      </td>
                      <td className="p-1.5 text-right">
                        <Button size="icon" variant="ghost" onClick={() => removeRow(i)} aria-label="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isRealData && (
            <div className="mt-5 rounded-lg border bg-muted/40 p-3">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wide text-muted-foreground">OCR Confidence</span>
                <span className="font-bold text-foreground">{avgConfidence}%</span>
              </div>
              <Progress value={avgConfidence} className="h-2" />
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2 sm:hidden">
            <Button variant="outline" onClick={() => {
              sessionStorage.removeItem("spss_scan_session");
              sessionStorage.removeItem("spss_review_form");
              navigate("/scan");
            }}><ScanLine className="mr-2 h-4 w-4" /> Rescan</Button>
            <Button variant="outline" onClick={handleAutoFill} disabled={!isRealData}><Wand2 className="mr-2 h-4 w-4" /> Auto-fill</Button>
            <Button onClick={handleConfirm} disabled={verifying} className="flex-1">
              {verifying
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</>
                : <><ShieldCheck className="mr-2 h-4 w-4" /> Confirm & Verify</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCRReview;
