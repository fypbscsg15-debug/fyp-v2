import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { mockInventory, InventoryItem } from "@/services/mockData";
import { apiEndpoints } from "@/services/api";
import { Search, Plus, Edit, AlertTriangle, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const stockStatus = (item: InventoryItem) => {
  if (item.quantity === 0) return { label: "Out of Stock", cls: "bg-severity-high-bg text-severity-high" };
  if (item.quantity < item.threshold * 0.5) return { label: "Critical", cls: "bg-severity-high-bg text-severity-high" };
  if (item.quantity < item.threshold) return { label: "Low", cls: "bg-severity-medium-bg text-severity-medium" };
  return { label: "In Stock", cls: "bg-success-soft text-success" };
};

const isExpiringSoon = (expiry: string) => {
  const d = new Date(expiry).getTime() - Date.now();
  return d < 1000 * 60 * 60 * 24 * 90 && d > 0;
};
const isExpired = (expiry: string) => new Date(expiry).getTime() < Date.now();

const MEDICINE_CATEGORIES = [
  "Analgesics / Antipyretics",
  "Antibiotics / Anti-infectives",
  "Anticoagulants / Blood Thinners",
  "Antidepressants / CNS Stimulants",
  "Antidiabetic / Insulin",
  "Antihistamines / Allergy Relief",
  "Antihypertensives / Cardiovascular",
  "Bronchodilators / Respiratory",
  "Dermatologicals / Topical Care",
  "Gastrointestinal / Proton Pump Inhibitors",
  "Hormonal Preparations",
  "Immunosuppressants",
  "Nutritional / Vitamin Supplements",
  "Ophthalmic / Eye Preparations",
  "General / Miscellaneous"
];

const SearchableCategory = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = MEDICINE_CATEGORIES.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative space-y-1.5 sm:col-span-2">
      <Label>Category</Label>
      <div className="relative">
        <Input
          placeholder="Search or select category..."
          value={open ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 200);
          }}
        />
        {open && (
          <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-md">
            {filtered.map((cat) => (
              <div
                key={cat}
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                onMouseDown={() => {
                  onChange(cat);
                  setOpen(false);
                }}
              >
                {cat}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-2 px-2 text-xs text-muted-foreground">
                No categories found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    apiEndpoints.inventory()
      .then((res) => {
        const mapped = res.data.map((item: any) => ({
          id: item.inventory_id,
          name: item.drug?.brand_name || "Unknown",
          generic: item.drug?.generic_name || "Unknown",
          batch: item.batch_number || "—",
          quantity: item.quantity_in_stock,
          threshold: item.low_stock_threshold,
          expiry: item.expiry_date || "—",
          location: item.location || "—",
          category: item.category || "General",
          unitPrice: item.unit_price || 0,
        }));
        setItems(mapped);
      })
      .catch(() => toast.error("Failed to load inventory"));
  }, []);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "expiring">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", generic: "", strength: "", quantity: "", expiry: "", threshold: "", location: "", category: "General / Miscellaneous", unitPrice: "" });
  const [editForm, setEditForm] = useState({ id: "", name: "", generic: "", quantity: "", expiry: "", threshold: "", location: "", category: "General / Miscellaneous", unitPrice: "" });

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (query && !it.name.toLowerCase().includes(query.toLowerCase()) && !it.generic.toLowerCase().includes(query.toLowerCase())) return false;
      if (filter === "low" && it.quantity >= it.threshold) return false;
      if (filter === "expiring" && !isExpiringSoon(it.expiry) && !isExpired(it.expiry)) return false;
      return true;
    });
  }, [items, query, filter]);

  const summary = useMemo(() => {
    const lowCount = items.filter((i) => i.quantity < i.threshold).length;
    const criticalCount = items.filter((i) => i.quantity === 0 || isExpired(i.expiry) || isExpiringSoon(i.expiry)).length;
    const totalValue = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    return { total: items.length, low: lowCount, critical: criticalCount, value: totalValue };
  }, [items]);

  const criticalItems = items.filter((i) => i.quantity === 0 || isExpired(i.expiry) || (i.quantity < i.threshold && isExpiringSoon(i.expiry)));

  const handleAdd = async () => {
    if (!form.name || !form.quantity) {
      toast.error("Name and quantity are required");
      return;
    }
    try {
      const payload = {
        brand_name: `${form.name} ${form.strength}`.trim(),
        generic_name: form.generic || form.name,
        standard_dosage: form.strength || "",
        quantity_in_stock: Number(form.quantity),
        low_stock_threshold: Number(form.threshold) || 20,
        expiry_date: form.expiry || "2026-12-31",
        location: form.location || "—",
        category: form.category || "General / Miscellaneous",
        unit_price: form.unitPrice ? Number(form.unitPrice) : 0.0,
      };
      await apiEndpoints.createInventory(payload);
      toast.success("Medicine added to inventory");
      setAddOpen(false);
      setForm({ name: "", generic: "", strength: "", quantity: "", expiry: "", threshold: "", location: "", category: "General / Miscellaneous", unitPrice: "" });
      
      const res = await apiEndpoints.inventory();
      const mapped = res.data.map((item: any) => ({
        id: item.inventory_id,
        name: item.drug?.brand_name || "Unknown",
        generic: item.drug?.generic_name || "Unknown",
        batch: item.batch_number || "—",
        quantity: item.quantity_in_stock,
        threshold: item.low_stock_threshold,
        expiry: item.expiry_date || "—",
        location: item.location || "—",
        category: item.category || "General",
        unitPrice: item.unit_price || 0,
      }));
      setItems(mapped);
    } catch (err) {
      toast.error("Failed to add medicine to database");
    }
  };

  const handleEditClick = (it: any) => {
    setEditForm({
      id: it.id,
      name: it.name,
      generic: it.generic,
      quantity: String(it.quantity),
      expiry: it.expiry === "—" ? "" : it.expiry,
      threshold: String(it.threshold),
      location: it.location === "—" ? "" : it.location,
      category: it.category === "—" ? "General / Miscellaneous" : it.category,
      unitPrice: String(it.unitPrice),
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.quantity) {
      toast.error("Quantity is required");
      return;
    }
    try {
      const payload = {
        quantity_in_stock: Number(editForm.quantity),
        low_stock_threshold: Number(editForm.threshold) || 20,
        expiry_date: editForm.expiry || null,
        location: editForm.location || "—",
        category: editForm.category || "General / Miscellaneous",
        unit_price: editForm.unitPrice ? Number(editForm.unitPrice) : 0.0,
      };
      await apiEndpoints.updateInventory(editForm.id, payload);
      toast.success("Medicine updated successfully");
      setEditOpen(false);
      
      const res = await apiEndpoints.inventory();
      const mapped = res.data.map((item: any) => ({
        id: item.inventory_id,
        name: item.drug?.brand_name || "Unknown",
        generic: item.drug?.generic_name || "Unknown",
        batch: item.batch_number || "—",
        quantity: item.quantity_in_stock,
        threshold: item.low_stock_threshold,
        expiry: item.expiry_date || "—",
        location: item.location || "—",
        category: item.category || "General",
        unitPrice: item.unit_price || 0,
      }));
      setItems(mapped);
    } catch (err) {
      toast.error("Failed to update medicine in database");
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Inventory Management"
        description="Track stock levels, expiries, and replenishment alerts"
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add New Medicine</Button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-elevated p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Total Items</p>
          <p className="mt-1 text-2xl font-bold">{summary.total}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs font-medium uppercase text-severity-medium">Low Stock Items</p>
          <p className="mt-1 text-2xl font-bold">{summary.low}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs font-medium uppercase text-severity-high">Critical Alerts</p>
          <p className="mt-1 text-2xl font-bold">{summary.critical}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Total Value</p>
          <p className="mt-1 text-2xl font-bold">Rs. {summary.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {criticalItems.length > 0 && (
        <div className="card-elevated mb-5 border-l-4 border-l-severity-high p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-severity-high" />
            <h3 className="text-sm font-semibold text-severity-high">Critical Alerts</h3>
          </div>
          <ul className="space-y-1 text-sm">
            {criticalItems.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{i.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {isExpired(i.expiry) ? "Expired" : i.quantity === 0 ? "Out of stock" : "Low + expiring"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card-elevated p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search medicine or generic name..." className="pl-9" />
          </div>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="expiring">Expiring Soon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left font-semibold">Medication</th>
                <th className="p-3 text-left font-semibold">Batch</th>
                <th className="p-3 text-left font-semibold">Qty</th>
                <th className="p-3 text-left font-semibold">Stock</th>
                <th className="p-3 text-left font-semibold">Expiry</th>
                <th className="p-3 text-left font-semibold">Location</th>
                <th className="p-3 text-left font-semibold">Category</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const s = stockStatus(it);
                return (
                  <tr key={it.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{it.name}</div>
                      <div className="text-xs text-muted-foreground">{it.generic}</div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{it.batch}</td>
                    <td className="p-3 font-semibold">{it.quantity}</td>
                    <td className="p-3"><span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", s.cls)}>{s.label}</span></td>
                    <td className={cn("p-3 text-xs", isExpired(it.expiry) ? "font-semibold text-severity-high" : isExpiringSoon(it.expiry) ? "font-semibold text-severity-medium" : "text-muted-foreground")}>
                      {it.expiry}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{it.location}</td>
                    <td className="p-3 text-xs text-muted-foreground">{it.category}</td>
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleEditClick(it)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-10 text-center text-sm text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8 opacity-40" /> No items match your filter
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Medicine</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Medicine Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Generic Name</Label><Input value={form.generic} onChange={(e) => setForm({ ...form, generic: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Strength / Dosage</Label><Input value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} placeholder="e.g. 500mg" /></div>
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Low Stock Threshold</Label><Input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Unit Price (Rs.)</Label><Input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="e.g. 150" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Shelf A-1" /></div>
            <SearchableCategory value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
            <div className="space-y-1.5 sm:col-span-2"><Label>Expiry Date</Label><Input type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Medicine</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Medicine Name</Label><Input value={editForm.name} disabled /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Generic Name</Label><Input value={editForm.generic} disabled /></div>
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Low Stock Threshold</Label><Input type="number" value={editForm.threshold} onChange={(e) => setEditForm({ ...editForm, threshold: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Unit Price (Rs.)</Label><Input type="number" step="0.01" value={editForm.unitPrice} onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })} placeholder="e.g. 150" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Location</Label><Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="e.g. Shelf A-1" /></div>
            <SearchableCategory value={editForm.category} onChange={(v) => setEditForm({ ...editForm, category: v })} />
            <div className="space-y-1.5 sm:col-span-2"><Label>Expiry Date</Label><Input type="date" value={editForm.expiry} onChange={(e) => setEditForm({ ...editForm, expiry: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
