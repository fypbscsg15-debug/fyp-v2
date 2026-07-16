import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { apiEndpoints } from "@/services/api";
import { toast } from "sonner";
import { Save, Upload, Plus, Trash2, RefreshCcw, Database } from "lucide-react";

export default function Settings() {
  const { user, staffRole } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [langPref, setLangPref] = useState("en");

  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  
  // Add User Modal State
  const [addOpen, setAddOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Pharmacist");

  const isShiftAdmin = staffRole?.toLowerCase() === "admin";

  useEffect(() => {
    if (isShiftAdmin) {
      apiEndpoints.listUsers()
        .then((res) => setUsers(res.data))
        .catch(() => toast.error("Failed to load users"));
    }
  }, [isShiftAdmin]);

  const saveProfile = async () => {
    if (currentPassword && newPassword) {
      try {
        await apiEndpoints.changePassword(currentPassword, newPassword);
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Failed to change password.");
      }
    } else {
      toast.success("Profile settings saved!");
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await apiEndpoints.deleteUser(id);
      setUsers(users.filter(u => u.pharmacist_id !== id));
      toast.success("User removed from system");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to remove user");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    try {
      const apiRole = newUserRole.toLowerCase() === "admin" ? "admin" : "pharmacist";
      const res = await apiEndpoints.createUser({
        name: newUserName,
        email: newUserEmail,
        password: "1234", // default password
        role: apiRole,
      });
      setUsers([...users, res.data]);
      setAddOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      toast.success(`${newUserName} added successfully`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create user");
    }
  };


  const [thresholds, setThresholds] = useState({
    interaction: "medium",
    dosage: "medium",
    contraindication: "medium",
    duplicate: "medium"
  });

  useEffect(() => {
    const saved = localStorage.getItem("spss_alert_thresholds");
    if (saved) {
      try {
        setThresholds(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveThresholds = () => {
    localStorage.setItem("spss_alert_thresholds", JSON.stringify(thresholds));
    toast.success("Alert rules saved!");
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Settings" description="Manage your account, organization, and system preferences" />

      <Tabs defaultValue={isShiftAdmin ? "profile" : "alerts"}>
        <TabsList className="flex w-full flex-wrap justify-start overflow-x-auto">
          {isShiftAdmin && <TabsTrigger value="profile">Profile</TabsTrigger>}
          {isShiftAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          <TabsTrigger value="alerts">Alert Rules</TabsTrigger>
          <TabsTrigger value="language">Language</TabsTrigger>
        </TabsList>

        {isShiftAdmin && (
          <TabsContent value="profile" className="card-elevated mt-4 space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Email / System ID</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Current Password</Label><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
            </div>
            <Button onClick={saveProfile}><Save className="mr-2 h-4 w-4" /> Save Profile</Button>
          </TabsContent>
        )}

        {isShiftAdmin && (
          <TabsContent value="users" className="card-elevated mt-4 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">User Management <span className="ml-2 text-xs font-normal text-muted-foreground">(Admin only)</span></h3>
              <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Add User</Button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Role</th><th className="p-3"></th></tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.pharmacist_id} className="border-t">
                      <td className="p-3 font-medium">{u.name}</td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3 text-xs capitalize">{u.role}</td>
                      <td className="p-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteUser(u.pharmacist_id)} className="hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}



        <TabsContent value="alerts" className="card-elevated mt-4 space-y-4 p-5">
          <h3 className="font-semibold">Alert Severity Thresholds</h3>
          {[
            { id: "interaction", label: "Drug Interactions" },
            { id: "dosage", label: "Dosage Errors" },
            { id: "contraindication", label: "Contraindications" },
            { id: "duplicate", label: "Duplicates" }
          ].map((cat) => (
            <div key={cat.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-sm font-medium">{cat.label}</span>
              <Select 
                value={thresholds[cat.id as keyof typeof thresholds]} 
                onValueChange={(val) => setThresholds((p) => ({ ...p, [cat.id]: val }))}
              >
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
          <Button onClick={saveThresholds}><Save className="mr-2 h-4 w-4" /> Save Rules</Button>
        </TabsContent>

        <TabsContent value="language" className="card-elevated mt-4 space-y-4 p-5">
          <h3 className="font-semibold">Language & Translation</h3>
          <div className="space-y-1.5"><Label>Default App Language</Label>
            <Select value={langPref} onValueChange={(v) => { setLangPref(v); toast.success("Language preference saved!"); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English (Default)</SelectItem>
                <SelectItem value="ur">اردو (Urdu)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Auto-translate patient instructions</p>
              <p className="text-xs text-muted-foreground">Translate generated instructions to patient's preferred language natively</p>
            </div>
            <Switch defaultChecked onCheckedChange={() => toast.success("Preference updated!")} />
          </div>
        </TabsContent>


      </Tabs>

      {/* Add User Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Register a new staff member to this terminal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required placeholder="e.g. Qasim Majid" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input required type="email" placeholder="staff@spss.health" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="Technician">Technician</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
