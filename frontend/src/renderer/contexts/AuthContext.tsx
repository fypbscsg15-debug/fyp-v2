import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiEndpoints, setToken, TOKEN_KEY } from "@/services/api";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "pharmacist";
  avatar?: string;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  staffName: string | null;
  staffRole: string | null;
  activeShiftId: string | null;
  setStaffSession: (name: string, role: string, shiftId: string) => void;
  clearStaffSession: () => void;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "spss_auth_user";
const STAFF_STORAGE_KEY = "spss_staff_session";

// Maps the backend PharmacistResponse shape to the frontend User type
const mapUser = (raw: any): User => ({
  id: raw.pharmacist_id ?? raw.id,
  name: raw.name,
  email: raw.email,
  role: raw.role,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Rehydrate from storage first for instant UI
        const rawUser = sessionStorage.getItem(STORAGE_KEY);
        if (rawUser) {
          setUser(JSON.parse(rawUser));
          // Validate token against backend silently
          try {
            const res = await apiEndpoints.me();
            const fresh = mapUser(res.data);
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
            setUser(fresh);
          } catch {
            setToken(null);
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(STORAGE_KEY);
            setUser(null);
            clearStaffSession();
          }
        }
        const rawStaff = sessionStorage.getItem(STAFF_STORAGE_KEY);
        if (rawStaff) setStaffName(rawStaff);
        const rawRole = sessionStorage.getItem("spss_staff_role");
        if (rawRole) setStaffRole(rawRole);
        const rawShiftId = sessionStorage.getItem("spss_active_shift_id");
        if (rawShiftId) setActiveShiftId(rawShiftId);
      } catch {}
      setLoading(false);
    };
    initAuth();
  }, []);

  const setStaffSession = (name: string, role: string, shiftId: string) => {
    sessionStorage.setItem(STAFF_STORAGE_KEY, name);
    sessionStorage.setItem("spss_staff_role", role);
    sessionStorage.setItem("spss_active_shift_id", shiftId);
    setStaffName(name);
    setStaffRole(role);
    setActiveShiftId(shiftId);
  };

  const clearStaffSession = () => {
    sessionStorage.removeItem(STAFF_STORAGE_KEY);
    sessionStorage.removeItem("spss_staff_role");
    sessionStorage.removeItem("spss_active_shift_id");
    setStaffName(null);
    setStaffRole(null);
    setActiveShiftId(null);
  };

  const login = async (email: string, password: string, remember = false) => {
    const res = await apiEndpoints.login(email, password);
    const { access_token, user: raw } = res.data;
    const userData = mapUser(raw);
    sessionStorage.setItem(TOKEN_KEY, access_token);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
  };

  const logout = () => {
    const shiftId = sessionStorage.getItem("spss_active_shift_id");
    if (shiftId) {
      apiEndpoints.endShift(shiftId).catch(() => {});
    }
    apiEndpoints.logout().catch(() => {});
    setToken(null);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
    clearStaffSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        staffName,
        staffRole,
        activeShiftId,
        setStaffSession,
        clearStaffSession,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
