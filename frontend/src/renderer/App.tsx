import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ScanPrescription from "./pages/ScanPrescription";
import OCRReview from "./pages/OCRReview";
import VerifyPrescription from "./pages/VerifyPrescription";
import Instructions from "./pages/Instructions";
import Inventory from "./pages/Inventory";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";
import Confirmation from "./pages/Confirmation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Protected = ({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) => (
  <ProtectedRoute adminOnly={adminOnly}>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Protected><Dashboard /></Protected>} />
              <Route path="/scan" element={<Protected><ScanPrescription /></Protected>} />
              <Route path="/ocr-review" element={<Protected><OCRReview /></Protected>} />
              <Route path="/ocr-review/:id" element={<Protected><OCRReview /></Protected>} />
              <Route path="/verify/:id" element={<Protected><VerifyPrescription /></Protected>} />
              <Route path="/instructions/:id" element={<Protected><Instructions /></Protected>} />
              <Route path="/inventory" element={<Protected><Inventory /></Protected>} />
              <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
              <Route path="/reports" element={<Protected><Reports /></Protected>} />
              <Route path="/audit-logs" element={<Protected adminOnly><AuditLog /></Protected>} />
              <Route path="/settings" element={<Protected><Settings /></Protected>} />
              <Route path="/confirmation/:id" element={<Protected><Confirmation /></Protected>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
