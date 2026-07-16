import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Download, Send, CheckCircle2, MessageSquare, Mail, Phone, Smartphone, Pill } from "lucide-react";
import { mockExtractedPrescription } from "@/services/mockData";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiEndpoints } from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

type SendChannel = "whatsapp" | "email" | "print";

const translateTimingToUrdu = (frequency: string = "", duration: string = ""): string => {
  const freq = frequency.toLowerCase().trim();
  let dur = duration.toLowerCase().trim();

  // 1. Translate frequency
  let freqUrdu = frequency;
  if (/^once\s+daily$|^1x\/day$|^1\/day$|^once\s+a\s+day$|^1\s+time\s+a\s+day$|^1\s+time\s+daily$|^1\s+times\s+daily$|^1\s+x\s+daily$/.test(freq)) {
    freqUrdu = "روزانہ ایک بار";
  } else if (/^twice\s+daily$|^2x\/day$|^2\/day$|^twice\s+a\s+day$|^2\s+times\s+a\s+day$|^2\s+time\s+daily$|^2\s+times\s+daily$|^2\s+x\s+daily$/.test(freq)) {
    freqUrdu = "روزانہ دو بار";
  } else if (/^three\s+times\s+daily$|^3\s*x\/day$|^3\/day$|^three\s+times\s+a\s+day$|^3\s+times\s+a\s+day$|^3\s+time\s+daily$|^3\s+times\s+daily$|^3\s+x\s+daily$/.test(freq)) {
    freqUrdu = "روزانہ تین بار";
  } else if (/^four\s+times\s+daily$|^4\s*x\/day$|^4\/day$|^four\s+times\s+a\s+day$|^4\s+times\s+a\s+day$|^4\s+time\s+daily$|^4\s+times\s+daily$|^4\s+x\s+daily$/.test(freq)) {
    freqUrdu = "روزانہ چار بار";
  } else if (/^five\s+times\s+daily$|^5\s*x\/day$|^5\/day$|^five\s+times\s+a\s+day$|^5\s+times\s+a\s+day$|^5\s+time\s+daily$|^5\s+times\s+daily$|^5\s+x\s+daily$/.test(freq)) {
    freqUrdu = "روزانہ پانچ بار";
  } else if (freq === "as needed" || freq === "prn" || freq.includes("as needed") || freq.includes("prn")) {
    freqUrdu = "ضرورت پڑنے پر";
  } else if (freq === "at bedtime" || freq === "bedtime" || freq.includes("bedtime")) {
    freqUrdu = "سوتے وقت";
  } else if (freq === "weekly" || freq.includes("weekly")) {
    freqUrdu = "ہفتہ وار";
  } else if (freq === "morning" || freq.includes("morning")) {
    freqUrdu = "صبح";
  } else if (freq === "afternoon" || freq.includes("afternoon")) {
    freqUrdu = "دوپہر";
  } else if (freq === "evening" || freq === "night" || freq.includes("evening") || freq.includes("night")) {
    freqUrdu = "شام / رات";
  } else {
    const hoursMatch = freq.match(/every\s+(\d+)\s+hours/) || freq.match(/(\d+)\s*hourly/);
    if (hoursMatch) {
      freqUrdu = `ہر ${hoursMatch[1]} گھنٹے بعد`;
    }
  }

  // 2. Translate duration
  let durUrdu = duration;
  if (/^\d+$/.test(dur)) {
    durUrdu = `${dur} دن`;
  } else {
    durUrdu = durUrdu.replace(/days?/g, "دن");
    durUrdu = durUrdu.replace(/weeks?/g, "ہفتے");
    durUrdu = durUrdu.replace(/months?/g, "مہینے");
  }

  return `${durUrdu} تک، ${freqUrdu}`;
};

const Instructions = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { t, lang, setLang } = useLanguage();
  const [sendOpen, setSendOpen] = useState(false);
  const [channel, setChannel] = useState<SendChannel>("whatsapp");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(true);
  const [rx, setRx] = useState<any>(null);

  useEffect(() => {
    const stateData = location.state as any;
    if (stateData && stateData.patientName && stateData.medications) {
      setRx({
        id: id || "rx_ocr",
        patientName: stateData.patientName,
        patientAge: stateData.patientAge || "",
        patientGender: stateData.patientGender || "",
        medicines: stateData.medications.map((m: any, idx: number) => ({
          id: m.id || `m_${idx}`,
          name: m.name,
          dosage: m.dosage || "",
          frequency: m.frequency || "",
          duration: m.duration || ""
        }))
      });
      setLoading(false);
      // Log instruction generation
      if (id && id !== "rx_1023" && id !== "rx_ocr") {
        apiEndpoints.logInstructions(id).catch(console.error);
      }
      return;
    }

    const fetchPrescription = async () => {
      try {
        let res;
        if (id && id !== "rx_1023" && id !== "rx_ocr" && id !== "latest") {
          res = await apiEndpoints.getPrescription(id);
        } else {
          res = await apiEndpoints.getLatestPrescription();
        }

        if (res.data) {
          setRx(res.data);
          // Log instruction generation
          const realId = res.data.id;
          if (realId && realId !== "rx_1023" && realId !== "rx_ocr") {
            apiEndpoints.logInstructions(realId).catch(console.error);
          }
        } else {
          setRx(mockExtractedPrescription);
        }
      } catch (err) {
        console.error("Failed to fetch prescription:", err);
        setRx(mockExtractedPrescription);
      } finally {
        setLoading(false);
      }
    };

    fetchPrescription();
  }, [id, location.state]);

  if (loading || !rx) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-muted-foreground">Loading instructions...</span>
      </div>
    );
  }

  const englishMessage = `Patient Instructions for ${rx.patientName}

Medications:
${rx.medicines.map((m: any, i: number) => `${i + 1}. ${m.name} ${m.dosage} — ${m.frequency} for ${m.duration}`).join("\n")}

Timing: Take with food unless otherwise specified.
Storage: Store at room temperature, away from direct sunlight.
Precautions: Do not skip doses. Complete the full course.
Warnings: Contact your pharmacist if you experience adverse effects.`;

  const urduMessage = `${rx.patientName} کے لیے ہدایات

دوائیں:
${rx.medicines.map((m: any, i: number) => `${i + 1}. ${m.name} ${m.dosage} — ${translateTimingToUrdu(m.frequency, m.duration)}`).join("\n")}

وقت: کھانے کے ساتھ لیں جب تک کہ ہدایت نہ کی جائے۔
ذخیرہ: کمرے کے درجہ حرارت پر، براہِ راست دھوپ سے دور رکھیں۔
احتیاط: خوراک نہ چھوڑیں۔ مکمل کورس مکمل کریں۔
انتباہ: ضمنی اثرات محسوس ہونے پر فارماسسٹ سے رابطہ کریں۔`;

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Patient Instructions", 14, 18);
    doc.setFontSize(11);
    doc.text(`Patient: ${rx.patientName}   Age: ${rx.patientAge}   Gender: ${rx.patientGender}`, 14, 28);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 35);
    let y = 48;
    rx.medicines.forEach((m, i) => {
      doc.text(`${i + 1}. ${m.name} ${m.dosage} — ${m.frequency} for ${m.duration}`, 14, y);
      y += 7;
    });
    doc.save(`instructions_${rx.id}.pdf`);
    toast.success("PDF downloaded");
  };

  const handleSend = () => {
    if (channel !== "print" && !contact.trim()) {
      toast.error("Please enter contact details");
      return;
    }

    const message = lang === "ur" ? urduMessage : englishMessage;

    const openExternal = (url: string) => {
      const winWithIpc = window as any;
      if (winWithIpc.ipcRenderer) {
        winWithIpc.ipcRenderer.invoke("open-external", url);
      } else {
        window.open(url, "_blank");
      }
    };

    if (channel === "whatsapp") {
      let cleaned = contact.replace(/\D/g, "");
      // Format local Pakistani numbers to international format (replace leading 0 with 92)
      if (cleaned.startsWith("0")) {
        cleaned = "92" + cleaned.substring(1);
      }
      const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
      openExternal(url);
      toast.success("Opening WhatsApp...");
    } else if (channel === "email") {
      // Use Gmail web composer since many devices don't have a default native mail client configured
      const subject = t("Medication Instructions", "ہدایاتِ ادویہ");
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      openExternal(url);
      toast.success("Opening Gmail Compose...");
    } else if (channel === "print") {
      handlePrint();
      toast.success("Opening print dialog...");
    }

    setSendOpen(false);
    setContact("");
  };

  const handleConfirmDispense = async () => {
    const realId = rx?.id || id;
    try {
      if (realId && realId !== "rx_1023" && realId !== "rx_ocr") {
        await apiEndpoints.dispensePrescription(realId);
      }
      toast.success("Prescription marked as dispensed");
      navigate(`/confirmation/${realId}`);
    } catch (err: any) {
      console.error("Failed to log dispense:", err);
      const errMsg = err.response?.data?.detail || "Failed to dispense. Check stock availability.";
      toast.error(errMsg);
    }
  };

  const channels: { id: SendChannel; label: string; Icon: any; placeholder: string; type: string }[] = [
    { id: "whatsapp", label: "WhatsApp", Icon: Smartphone, placeholder: "+92 300 1234567", type: "tel" },
    { id: "email", label: "Email", Icon: Mail, placeholder: "patient@example.com", type: "email" },
    { id: "print", label: "Print (Physical Copy)", Icon: Printer, placeholder: "", type: "text" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Patient Instructions"
        description="Generate, translate, and deliver medication instructions"
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            <Button variant="outline" onClick={handleDownload}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
            <Button variant="outline" onClick={() => setSendOpen(true)}><Send className="mr-2 h-4 w-4" /> Send to Patient</Button>
            <Button onClick={handleConfirmDispense}><CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Dispensing</Button>
          </div>
        }
      />

      <div className="card-elevated mb-4 p-5 no-print">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prescription Summary</p>
            <h3 className="mt-1 text-lg font-bold">{rx.patientName}</h3>
            <p className="text-sm text-muted-foreground">Age {rx.patientAge} · {rx.patientGender} · {new Date().toLocaleDateString()}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {rx.medicines.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                  <Pill className="h-3 w-3" /> {m.name} {m.dosage}
                </span>
              ))}
            </div>
          </div>
          <Tabs value={lang} onValueChange={(v) => setLang(v as any)}>
            <TabsList>
              <TabsTrigger value="en">EN</TabsTrigger>
              <TabsTrigger value="ur">اردو</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="card-elevated print-area p-6 sm:p-8" dir={lang === "ur" ? "rtl" : "ltr"}>
        <h2 className={cn("text-xl font-bold", lang === "ur" && "urdu text-right")}>
          {t("Medication Instructions", "ہدایاتِ ادویہ")}
        </h2>
        <p className={cn("mt-1 text-sm text-muted-foreground", lang === "ur" && "urdu text-right")}>
          {t(`For ${rx.patientName}`, `برائے ${rx.patientName}`)}
        </p>

        <div className="mt-6 space-y-5">
          {rx.medicines.map((m, i) => (
            <div key={m.id} className="rounded-lg border p-4">
              <h3 className={cn("font-semibold text-foreground", lang === "ur" ? "urdu text-right" : "text-left")}>
                <span dir="ltr">{i + 1}. {m.name} — {m.dosage}</span>
              </h3>
              <p className={cn("mt-1 text-sm", lang === "ur" && "urdu text-right")}>
                <span className="font-medium">{t("Timing:", "وقت:")} </span>
                {lang === "ur" ? translateTimingToUrdu(m.frequency, m.duration) : `${m.frequency} for ${m.duration}`}
              </p>
              <p className={cn("mt-1 text-sm", lang === "ur" && "urdu text-right")}>
                <span className="font-medium">{t("Storage:", "ذخیرہ:")} </span>
                {t("Store at room temperature, away from direct sunlight.", "کمرے کے درجہ حرارت پر، براہِ راست دھوپ سے دور رکھیں۔")}
              </p>
              <p className={cn("mt-1 text-sm", lang === "ur" && "urdu text-right")}>
                <span className="font-medium">{t("Precautions:", "احتیاط:")} </span>
                {t("Do not skip doses. Complete the full course as prescribed.", "خوراک نہ چھوڑیں۔ مکمل کورس مکمل کریں۔")}
              </p>
            </div>
          ))}
        </div>

        <div className={cn("mt-6 rounded-lg border border-severity-medium-border bg-severity-medium-bg p-4", lang === "ur" && "text-right")}>
          <p className={cn("text-sm font-semibold text-severity-medium", lang === "ur" && "urdu")}>
            {t("Special Notes & Warnings", "خصوصی نوٹس اور انتباہات")}
          </p>
          <p className={cn("mt-1 text-sm text-foreground", lang === "ur" && "urdu")}>
            {t(
              "Contact your pharmacist immediately if you experience any adverse effects, allergic reactions, or unusual symptoms.",
              "اگر آپ کو کوئی ضمنی اثر، الرجی یا غیر معمولی علامات محسوس ہوں تو فوراً اپنے فارماسسٹ سے رابطہ کریں۔"
            )}
          </p>
        </div>
      </div>

      {/* Send modal */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Instructions to Patient</DialogTitle>
            <DialogDescription>Choose how you want to deliver these instructions.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            {channels.map((c) => {
              const Icon = c.Icon;
              const active = channel === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                    active ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {c.id === "whatsapp" ? "WhatsApp" : c.id === "email" ? "Email" : "Print"}
                </button>
              );
            })}
          </div>

          {channel !== "print" && (
            <div className="space-y-1.5">
              <Label htmlFor="contact" className="flex items-center gap-1.5">
                {channel === "email" ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                {channel === "email" ? "Email address" : "Phone number"}
              </Label>
              <Input
                id="contact"
                type={channels.find((c) => c.id === channel)!.type}
                placeholder={channels.find((c) => c.id === channel)!.placeholder}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Message preview</Label>
            <Textarea readOnly rows={6} value={lang === "ur" ? urduMessage : englishMessage} className="text-xs" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
            <Button onClick={handleSend}><Send className="mr-2 h-4 w-4" /> Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Instructions;
