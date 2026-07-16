import { useState, useEffect } from "react";
import { Bell, Menu, Settings, LogOut, Lock, User as UserIcon, Languages, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { apiEndpoints } from "@/services/api";
import { cn } from "@/lib/utils";

export const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { user, logout, staffName, staffRole, activeShiftId, clearStaffSession } = useAuth();
  const { lang, toggle } = useLanguage();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    apiEndpoints.inventory()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          const alerts: any[] = [];
          const today = new Date();
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(today.getDate() + 30);

          res.data.forEach((item: any, idx: number) => {
            const expDate = new Date(item.expiry_date);
            const medName = item.drug?.brand_name || item.drug?.generic_name || "Unknown Medicine";
            
            // Check low stock
            if (item.quantity_in_stock < item.low_stock_threshold) {
              alerts.push({
                id: `low_${item.inventory_id || idx}`,
                title: `Low stock: ${medName}`,
                description: `Only ${item.quantity_in_stock} left (Threshold: ${item.low_stock_threshold})`,
                unread: true,
                time: "Current Alert"
              });
            }

            // Check expired or about to expire
            if (expDate <= today) {
              alerts.push({
                id: `exp_${item.inventory_id || idx}`,
                title: `Expired: ${medName}`,
                description: `Expired on ${item.expiry_date}`,
                unread: true,
                time: "Expired"
              });
            } else if (expDate <= thirtyDaysFromNow) {
              alerts.push({
                id: `exp_soon_${item.inventory_id || idx}`,
                title: `About to expire: ${medName}`,
                description: `Expires on ${item.expiry_date}`,
                unread: true,
                time: "Expires soon"
              });
            }
          });
          
          setNotifications(alerts);
        }
      })
      .catch(console.error);
  }, []);

  const clearNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNotifications([]);
  };

  const handleEndShift = () => {
    if (activeShiftId) {
      apiEndpoints.endShift(activeShiftId).catch(() => {});
    }
    clearStaffSession();
    // Stay authenticated — user goes to StaffUnlock ("Who is on shift?")
  };

  const handleLockAndSignOut = () => {
    logout();
    navigate("/login");
  };

  const unread = notifications.filter((n) => n.unread).length;
  const initials = (user?.name || "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-card/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden min-w-0 flex-1 sm:block">
        <h2 className="truncate text-base font-semibold text-foreground">Smart Pharmacist Support System</h2>
        <p className="truncate text-xs text-muted-foreground">Clinical decision support & dispensing workflow</p>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {staffName && (
          <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-500 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>Shift: {staffName} ({staffRole})</span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-[350px] overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-1.5">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              {notifications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  onClick={clearAllNotifications}
                >
                  Clear All
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No new notifications</div>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="group relative flex flex-col items-start gap-1.5 py-2 pr-8">
                  <div className="flex w-full items-start gap-2">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.unread ? "bg-primary" : "bg-muted-foreground/40")} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                    </div>
                  </div>
                  <span className="ml-4 text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium text-muted-foreground">{n.time}</span>
                  
                  <button
                    onClick={(e) => clearNotification(n.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-opacity"
                    aria-label="Clear notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {staffRole?.toLowerCase() === "admin" && (
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-1.5 pr-2.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {staffRole?.toLowerCase() === "admin" && (
              <>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleEndShift} className="text-amber-600 focus:text-amber-600">
              <LogOut className="mr-2 h-4 w-4" /> End Shift
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLockAndSignOut} className="text-destructive focus:text-destructive">
              <Lock className="mr-2 h-4 w-4" /> Lock Machine & Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
