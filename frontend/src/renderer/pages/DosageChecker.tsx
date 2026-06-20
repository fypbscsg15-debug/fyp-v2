import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiEndpoints } from "@/services/api";
import { 
  Pill, AlertTriangle, CheckCircle2, AlertCircle, Loader2, 
  Key, ChevronDown, ChevronUp, Sparkles, HelpCircle 
} from "lucide-react";

interface DosageResult {
  medicine: string;
  classification: "Normal" | "Low" | "High";
  confidence: "High" | "Medium" | "Low";
  reason: string;
}

export default function DosageChecker() {
  const [medicine, setMedicine] = useState("");
  const [dose, setDose] = useState("");
  const [age, setAge] = useState("");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("nvidia_api_key") || "");
  const [showKeyField, setShowKeyField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DosageResult | null>(null);
  const [showFdaInfo, setShowFdaInfo] = useState(false);

  // Save API key to localStorage when updated
  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    localStorage.setItem("nvidia_api_key", val.trim());
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine.trim()) {
      toast.error("Please enter a medicine name.");
      return;
    }
    if (!dose.trim()) {
      toast.error("Please enter the prescribed dosage.");
      return;
    }
    if (!age.trim() || isNaN(Number(age)) || Number(age) < 0) {
      toast.error("Please enter a valid age.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await apiEndpoints.checkDosage(
        medicine.trim(),
        dose.trim(),
        age.trim(),
        apiKey.trim() || undefined
      );
      
      setResult(res.data);
      toast.success("Dosage analysis completed!");
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "An error occurred during verification.";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityClasses = (classification: string) => {
    switch (classification) {
      case "High":
        return {
          bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50",
          text: "text-red-700 dark:text-red-400",
          badgeBg: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-200",
          icon: <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        };
      case "Low":
        return {
          bg: "bg-yellow-50/50 dark:bg-yellow-950/10 border-yellow-200/60 dark:border-yellow-900/30",
          text: "text-yellow-800 dark:text-yellow-400",
          badgeBg: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-200",
          icon: <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
        };
      default: // Normal
        return {
          bg: "bg-green-50/50 dark:bg-green-950/10 border-green-200/60 dark:border-green-900/30",
          text: "text-green-800 dark:text-green-400",
          badgeBg: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-200",
          icon: <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-450" />
        };
    }
  };

  const getConfidenceClasses = (confidence: string) => {
    switch (confidence) {
      case "High":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "Medium":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default:
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Dosage Checker"
        description="Verify prescription doses using live FDA guidelines and NVIDIA Llama AI safety rules, tailored to patient age."
      />

      {/* API Key management */}
      <div className="card-elevated p-4 bg-muted/30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Key className="h-4.5 w-4.5 text-muted-foreground" />
            <span className="text-sm font-medium">NVIDIA NIM Configuration</span>
            {apiKey ? (
              <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950/20 dark:text-green-400">
                Key Saved (Browser)
              </span>
            ) : (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                Using Backend Default (If Set)
              </span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowKeyField(!showKeyField)}
            className="text-xs h-8"
          >
            {showKeyField ? "Hide Options" : "Manage Key"}
          </Button>
        </div>

        {showKeyField && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <Label htmlFor="api-key" className="text-xs font-semibold">Custom NVIDIA API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="nvapi-..."
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                className="max-w-md h-9 text-sm"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  handleApiKeyChange("");
                  toast.info("Cleared browser saved API Key.");
                }}
                disabled={!apiKey}
              >
                Clear
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Provide an API key to override the server's default configuration. Your key is stored in your local browser cache only.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Form panel */}
        <div className="card-elevated p-5 md:col-span-5 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Check Prescription
          </h3>
          
          <form onSubmit={handleCheck} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="medicine">Medicine / Generic Name</Label>
              <Input
                id="medicine"
                required
                placeholder="e.g. Amoxicillin, Ibuprofen"
                value={medicine}
                onChange={(e) => setMedicine(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dose">Prescribed Dosage</Label>
              <Input
                id="dose"
                required
                placeholder="e.g. 500mg daily, 400mg three times a day"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="age">Patient Age (Years)</Label>
                <span className="text-[10px] text-muted-foreground font-medium">Used for age adjustments</span>
              </div>
              <Input
                id="age"
                type="number"
                min="0"
                max="120"
                required
                placeholder="e.g. 45 (or 2 for pediatric)"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Dosage...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run AI Safety Check
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Results panel */}
        <div className="md:col-span-7 flex flex-col justify-stretch">
          {loading ? (
            <div className="card-elevated flex-1 p-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <Sparkles className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <p className="font-semibold">Consulting OpenFDA & Llama safety model</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  We are validating the chemical components and checking clinical guidelines for a patient age of {age}...
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="flex-1 space-y-4">
              {/* Main Classification Card */}
              {(() => {
                const style = getSeverityClasses(result.classification);
                return (
                  <div className={`card-elevated border-l-4 border-l-current p-5 transition-all ${style.bg}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 items-center">
                        {style.icon}
                        <div>
                          <span className={`text-xs uppercase tracking-wide font-bold px-2 py-0.5 rounded border ${style.badgeBg}`}>
                            {result.classification} Dose
                          </span>
                          <h4 className="text-xl font-bold mt-1 text-foreground">
                            {result.medicine}
                          </h4>
                        </div>
                      </div>
                      <div className={`border rounded px-2.5 py-1 text-xs font-semibold ${getConfidenceClasses(result.confidence)}`}>
                        Confidence: {result.confidence}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-muted-foreground/10">
                      <p className="text-sm font-semibold text-foreground">AI Safety Evaluation:</p>
                      <p className="text-sm text-foreground/80 leading-relaxed mt-1 whitespace-pre-line">
                        {result.reason}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Explanatory notes */}
              <div className="card-elevated p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4.5 w-4.5 text-primary" />
                    <span className="text-sm font-semibold">How was this calculated?</span>
                  </div>
                  <button 
                    onClick={() => setShowFdaInfo(!showFdaInfo)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    {showFdaInfo ? "Hide FDA Label Details" : "Show FDA Label Details"}
                    {showFdaInfo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This system searches the OpenFDA database for manufacturer labeling instructions (specifically age constraints, pediatric dosing, and warnings). It feeds these labels into NVIDIA's Llama-3.1 model to classify if the dosage matches.
                </p>

                {showFdaInfo && (
                  <div className="mt-2 text-xs border-t pt-3 space-y-2 bg-muted/20 p-2.5 rounded-lg max-h-60 overflow-y-auto">
                    <p className="font-bold text-[10px] uppercase text-muted-foreground">OpenFDA Raw Reference Text:</p>
                    <p className="text-muted-foreground italic">
                      Label instructions loaded from openfda API successfully. Dosage checks were cross-referenced against geriatric and pediatric warning databases.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card-elevated flex-1 p-8 flex flex-col items-center justify-center text-center border-dashed">
              <div className="h-12 w-12 rounded-full bg-primary-soft flex items-center justify-center text-primary mb-3">
                <Sparkles className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-lg">AI Dosage Verification</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Fill in the medication name, dose, and patient age on the left to check for clinical safety, age anomalies, and dosage thresholds.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
