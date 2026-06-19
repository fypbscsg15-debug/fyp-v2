import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiEndpoints } from "@/services/api";
import { UserCircle2, ShieldCheck, LogOut } from "lucide-react";

export const StaffUnlock = () => {
  const { setStaffSession, user, logout } = useAuth();
  const [name, setName] = useState("");
  const [role, setRole] = useState("Pharmacist");
  const [error, setError] = useState("");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Please enter a valid name");
      return;
    }
    try {
      const res = await apiEndpoints.startShift({ staff_name: name.trim(), staff_role: role });
      const shift = res.data;
      setStaffSession(name.trim(), role, shift.shift_id);
    } catch (err) {
      setError("Failed to start shift in system.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-sm animate-fade-in space-y-6">
        
        <div className="flex items-center justify-center space-x-2 text-sm font-medium text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 py-2 px-4 rounded-full mx-auto w-max">
          <ShieldCheck className="h-4 w-4" />
          <span>Machine Authenticated as {user?.email}</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-8 space-y-8 text-center">
          <div className="space-y-2">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <UserCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Who is on shift?
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Enter your name to unlock the system and begin your session. All actions will be logged under your name.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="staffName">Staff Name</Label>
              <Input 
                id="staffName"
                placeholder="e.g. John Doe" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="text-lg"
              />
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="staffRole">Staff Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="staffRole" className="w-full text-lg">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="Medician">Medician</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-500 text-left">{error}</p>}
            
            <Button size="lg" className="w-full font-medium" type="submit">
              Unlock Terminal
            </Button>
          </form>
        </div>

        <div className="text-center">
          <button 
            onClick={logout}
            className="flex items-center justify-center space-x-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mx-auto"
          >
            <LogOut className="h-4 w-4" />
            <span>Lock Machine & Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
