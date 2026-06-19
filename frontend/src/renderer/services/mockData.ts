// Mock data for SPSS — replace with real FastAPI calls via services/api.ts

export const mockStats = {
  todaysPrescriptions: 24,
  pendingVerification: 3,
  errorDetectionRate: 94,
  lowStockAlerts: 2,
};

export const mockRecentActivity = [
  { id: "a1", time: "10:42 AM", action: "Prescription #1023 verified", status: "verified" as const, user: "Dr. Ali" },
  { id: "a2", time: "10:28 AM", action: "Drug interaction detected for #1022", status: "alert" as const, user: "System" },
  { id: "a3", time: "10:14 AM", action: "Prescription #1021 dispensed", status: "verified" as const, user: "Dr. Ali" },
  { id: "a4", time: "09:58 AM", action: "Low stock alert: Amoxicillin 500mg", status: "alert" as const, user: "System" },
  { id: "a5", time: "09:41 AM", action: "Prescription #1020 awaiting review", status: "pending" as const, user: "Dr. Sara" },
  { id: "a6", time: "09:22 AM", action: "Prescription #1019 verified", status: "verified" as const, user: "Dr. Ali" },
];

export type Medicine = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
};

export const mockExtractedPrescription = {
  id: "rx_1023",
  patientName: "Ahmed Khan",
  patientAge: "42",
  patientGender: "Male" as const,
  confidence: 92,
  imageUrl: "/placeholder.svg",
  medicines: [
    { id: "m1", name: "Amoxicillin", dosage: "500mg", frequency: "3 times/day", duration: "7 days" },
    { id: "m2", name: "Paracetamol", dosage: "500mg", frequency: "4 times/day", duration: "5 days" },
    { id: "m3", name: "Omeprazole", dosage: "20mg", frequency: "Once daily (morning)", duration: "14 days" },
  ] as Medicine[],
};

export type Severity = "high" | "medium" | "low";
export type AlertCategory = "interaction" | "dosage" | "contraindication" | "duplicate";

export type SafetyAlert = {
  id: string;
  severity: Severity;
  category: AlertCategory;
  title: string;
  description: string;
  reference: string;
};

export const mockAlerts: SafetyAlert[] = [
  {
    id: "al1",
    severity: "high",
    category: "interaction",
    title: "Drug Interaction: Warfarin + Amoxicillin",
    description: "Concurrent use may increase the anticoagulant effect of warfarin, raising bleeding risk.",
    reference: "Lexicomp 2024 — Major interaction (Class C)",
  },
  {
    id: "al2",
    severity: "high",
    category: "dosage",
    title: "Dosage exceeds recommended maximum",
    description: "Paracetamol 4×500mg + 1g additional dose may exceed 4g/day hepatotoxicity threshold.",
    reference: "BNF 86 — Maximum daily dose 4g",
  },
  {
    id: "al3",
    severity: "medium",
    category: "contraindication",
    title: "Caution: Omeprazole with hepatic impairment",
    description: "Patient history indicates hepatic impairment. Consider dose reduction.",
    reference: "FDA Label — Hepatic dosing guidance",
  },
  {
    id: "al4",
    severity: "medium",
    category: "duplicate",
    title: "Therapeutic duplication",
    description: "Two NSAIDs prescribed concurrently. Review necessity.",
    reference: "Internal CDS rule #DUP-014",
  },
  {
    id: "al5",
    severity: "low",
    category: "dosage",
    title: "Frequency clarification needed",
    description: "Frequency for Omeprazole could be specified as morning vs evening for optimal absorption.",
    reference: "Best practice — PPI administration",
  },
];

export type InventoryItem = {
  id: string;
  name: string;
  generic: string;
  batch: string;
  quantity: number;
  threshold: number;
  expiry: string;
  location: string;
  category: string;
  unitPrice: number;
};

export const mockInventory: InventoryItem[] = [
  { id: "i1", name: "Amoxicillin 500mg", generic: "Amoxicillin", batch: "AMX-2401", quantity: 8, threshold: 20, expiry: "2025-08-12", location: "A-1", category: "Antibiotic", unitPrice: 0.45 },
  { id: "i2", name: "Paracetamol 500mg", generic: "Acetaminophen", batch: "PCM-2403", quantity: 320, threshold: 50, expiry: "2026-04-20", location: "A-2", category: "Analgesic", unitPrice: 0.05 },
  { id: "i3", name: "Omeprazole 20mg", generic: "Omeprazole", batch: "OMP-2402", quantity: 12, threshold: 30, expiry: "2025-06-30", location: "B-1", category: "PPI", unitPrice: 0.22 },
  { id: "i4", name: "Metformin 850mg", generic: "Metformin HCl", batch: "MET-2310", quantity: 0, threshold: 40, expiry: "2024-11-01", location: "B-2", category: "Antidiabetic", unitPrice: 0.18 },
  { id: "i5", name: "Atorvastatin 20mg", generic: "Atorvastatin", batch: "ATV-2405", quantity: 145, threshold: 30, expiry: "2026-02-15", location: "C-1", category: "Statin", unitPrice: 0.32 },
  { id: "i6", name: "Lisinopril 10mg", generic: "Lisinopril", batch: "LSN-2404", quantity: 18, threshold: 25, expiry: "2025-12-10", location: "C-2", category: "Antihypertensive", unitPrice: 0.27 },
  { id: "i7", name: "Salbutamol Inhaler", generic: "Salbutamol", batch: "SLB-2401", quantity: 6, threshold: 10, expiry: "2025-09-22", location: "D-1", category: "Bronchodilator", unitPrice: 4.50 },
  { id: "i8", name: "Insulin Glargine", generic: "Insulin Glargine", batch: "INS-2406", quantity: 4, threshold: 8, expiry: "2025-05-18", location: "Cold-1", category: "Antidiabetic", unitPrice: 32.00 },
  { id: "i9", name: "Ibuprofen 400mg", generic: "Ibuprofen", batch: "IBU-2402", quantity: 210, threshold: 60, expiry: "2026-07-30", location: "A-3", category: "NSAID", unitPrice: 0.08 },
  { id: "i10", name: "Cetirizine 10mg", generic: "Cetirizine", batch: "CTZ-2403", quantity: 95, threshold: 30, expiry: "2025-11-15", location: "D-2", category: "Antihistamine", unitPrice: 0.06 },
];

export const mockAuditLogs = Array.from({ length: 22 }, (_, i) => ({
  id: `log_${i + 1}`,
  timestamp: `2025-04-${String(15 - (i % 10)).padStart(2, "0")} ${String(9 + (i % 8)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
  user: ["Dr. Ali", "Dr. Sara", "Admin", "Dr. Hassan"][i % 4],
  action: ["Prescription Verified", "Override Applied", "Inventory Updated", "Alert Resolved", "Login", "Settings Changed"][i % 6],
  prescriptionId: `#${1000 + i}`,
  details: "Action completed successfully without anomalies.",
}));

export const mockAnalytics = {
  totalPrescriptions: 1245,
  totalErrors: 78,
  avgVerificationTime: 2.4,
  topAlert: { name: "Drug Interactions", percent: 45 },
  volumeData: [
    { day: "Mon", value: 38, target: 50 },
    { day: "Tue", value: 52, target: 50 },
    { day: "Wed", value: 47, target: 50 },
    { day: "Thu", value: 61, target: 50 },
    { day: "Fri", value: 55, target: 50 },
    { day: "Sat", value: 42, target: 50 },
    { day: "Sun", value: 30, target: 50 },
  ],
  accuracyData: [
    { day: "Mon", value: 92, target: 95 },
    { day: "Tue", value: 94, target: 95 },
    { day: "Wed", value: 93, target: 95 },
    { day: "Thu", value: 96, target: 95 },
    { day: "Fri", value: 95, target: 95 },
    { day: "Sat", value: 94, target: 95 },
    { day: "Sun", value: 97, target: 95 },
  ],
  alertTypes: [
    { name: "Drug Interactions", value: 45 },
    { name: "Dosage Errors", value: 25 },
    { name: "Contraindications", value: 20 },
    { name: "Duplicates", value: 10 },
  ],
  verificationTime: [
    { day: "Mon", value: 2.8, target: 3 },
    { day: "Tue", value: 2.4, target: 3 },
    { day: "Wed", value: 2.6, target: 3 },
    { day: "Thu", value: 2.1, target: 3 },
    { day: "Fri", value: 2.3, target: 3 },
    { day: "Sat", value: 2.5, target: 3 },
    { day: "Sun", value: 2.0, target: 3 },
  ],
};

export const mockNotifications = [
  { id: "n1", title: "Low stock: Amoxicillin", time: "5 min ago", unread: true },
  { id: "n2", title: "Prescription #1023 awaits review", time: "12 min ago", unread: true },
  { id: "n3", title: "Daily report ready", time: "1 hr ago", unread: false },
];
