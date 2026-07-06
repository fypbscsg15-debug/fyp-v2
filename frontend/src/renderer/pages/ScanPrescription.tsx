import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { UploadCloud, ScanLine, Camera, RotateCw, Crop, X, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiEndpoints } from "@/services/api";

const ScanPrescription = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);

  const handleManualEntry = () => {
    sessionStorage.removeItem("spss_scan_session");
    sessionStorage.removeItem("spss_review_form");
    navigate("/ocr-review");
  };

  useEffect(() => {
    const activeSession = sessionStorage.getItem("spss_scan_session");
    if (activeSession) {
      navigate("/ocr-review");
    }
  }, [navigate]);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setRotation(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiEndpoints.scanPrescription(formData);
      const scanData = {
        ocrResults: res.data.results,
        filename: res.data.filename,
        textCount: res.data.text_count,
        imageUrl: preview,
      };
      sessionStorage.setItem("spss_scan_session", JSON.stringify(scanData));
      sessionStorage.removeItem("spss_review_form");
      toast.success("OCR extraction complete");
      navigate("/ocr-review", {
        state: scanData,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        (err.code === "ECONNABORTED" ? "OCR timed out — image may be too large" : "OCR failed. Is the OCR service running?");
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview("");
    setRotation(0);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Scan Prescription" description="Upload a prescription image to extract its contents via OCR" />

      <div className="card-elevated p-6">
        {!preview ? (
          <>
            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
                isDragActive ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50 hover:bg-muted/40"
              )}
            >
              <input {...getInputProps()} />
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
                <UploadCloud className="h-8 w-8 text-primary" />
              </div>
              <p className="text-base font-semibold text-foreground">
                {isDragActive ? "Drop file here..." : "Click to upload or drag and drop"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Supported: JPEG, PNG · max 10 MB</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline" onClick={() => toast.info("Scanner integration: connect via Electron IPC")}>
                <ScanLine className="mr-2 h-4 w-4" /> Use Scanner
              </Button>
              <Button variant="outline" onClick={() => toast.info("Camera capture: connect device camera in production")}>
                <Camera className="mr-2 h-4 w-4" /> Use Camera
              </Button>
              <Button variant="outline" onClick={handleManualEntry}>
                <FileText className="mr-2 h-4 w-4" /> Manual Entry
              </Button>
            </div>
          </>
        ) : (
          <div>
            <div className="relative overflow-hidden rounded-xl bg-muted">
              <div className="flex min-h-[300px] items-center justify-center p-4">
                <img
                  src={preview}
                  alt="Prescription preview"
                  className="max-h-[420px] rounded-md object-contain transition-transform"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
              </div>

              <div className="absolute right-3 top-3 flex gap-1.5">
                <Button size="icon" variant="secondary" onClick={() => setRotation((r) => r + 90)} aria-label="Rotate">
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="secondary" onClick={() => toast.info("Crop tool")} aria-label="Crop">
                  <Crop className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="secondary" onClick={handleClear} aria-label="Remove">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {processing && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Running OCR — this may take 10–30 seconds...
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" onClick={handleClear} disabled={processing}>Cancel</Button>
              <Button onClick={handleProcess} disabled={processing}>
                {processing
                  ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing OCR...</>)
                  : "Process"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanPrescription;
