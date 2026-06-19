import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ScanLine, ShieldCheck, FileText, Package,
  BarChart3, FileBarChart, History, Settings, Pill, X
} from "lucide-react";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/scan", label: "Scan Prescription", icon: ScanLine },
  { to: "/verify/rx_1023", label: "Verify", icon: ShieldCheck },
  { to: "/instructions/rx_1023", label: "Instructions", icon: FileText },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/audit-logs", label: "Audit Log", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const Sidebar = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
          "transition-opacity"
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-primary">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-sidebar-foreground">SPSS</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Pharmacist System</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent lg:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to.split("/:")[0].replace(/\/rx_\w+$/, ""));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    (isActive || active)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">SPSS v1.0.0</p>
          <p className="text-[10px] text-muted-foreground">© 2025 Smart Pharmacist</p>
        </div>
      </aside>
    </>
  );
};
