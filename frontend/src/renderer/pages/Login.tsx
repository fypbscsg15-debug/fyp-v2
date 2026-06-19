import { useState, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Pill, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("PHARM-001");
  const [password, setPassword] = useState("1234");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = (location.state as any)?.from?.pathname || "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, remember);
      toast.success("Terminal unlocked successfully!");
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "License Authorization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md animate-fade-in relative">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-700 shadow-xl">
            <ShieldAlert className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">SPSS POS terminal</h1>
          <p className="mt-1 text-sm text-zinc-500">System Locked • Requires Location Authorization</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 shadow-xl rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Machine Authorization</h2>
          <p className="mt-1 text-sm text-zinc-500">Provide the pharmacy license to unlock this computer</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="email">Pharmacy License ID</Label>
              <Input
                id="email"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="PHARM-001"
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="password">Terminal Pin / Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 text-red-700 p-3 text-sm border border-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authorizing Terminal...</>) : "Authorize & Proceed"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">Desktop Client Version 1.0.0 · © 2025 SPSS</p>
      </div>
    </div>
  );
};

export default Login;
