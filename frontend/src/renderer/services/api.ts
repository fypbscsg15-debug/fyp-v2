import axios from "axios";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";

export const TOKEN_KEY = "spss_auth_token";

// Cached in memory so the interceptor avoids storage I/O on every request
let _cachedToken: string | null =
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const setToken = (token: string | null) => {
  _cachedToken = token;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (_cachedToken) config.headers["Authorization"] = `Bearer ${_cachedToken}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      _cachedToken = null;
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(err);
  }
);

export const apiEndpoints = {
  login: (email: string, password: string) => api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  createUser: (payload: { name: string; email: string; password: string; role: string }) =>
    api.post("/auth/users", payload),
  listUsers: () => api.get("/auth/users"),
  updateUser: (id: string, payload: { name?: string; role?: string; is_active?: boolean }) =>
    api.patch(`/auth/users/${id}`, payload),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
  changePassword: (current_password: string, new_password: string) =>
    api.post("/auth/change-password", { current_password, new_password }),
  scanPrescription: (formData: FormData) =>
    api.post("/prescriptions/scan", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    }),
  uploadPrescription: (formData: FormData) =>
    api.post("/prescriptions/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  verifyPrescription: (
    medicines: string[],
    patientName?: string,
    patientAge?: string,
    patientGender?: string,
    dosages?: string[]
  ) =>
    api.post("/prescriptions/verify", {
      medicines,
      patient_name: patientName,
      patient_age: patientAge,
      patient_gender: patientGender,
      dosages
    }),
  ocrExtract: (id: string) => api.post(`/prescriptions/${id}/ocr`),
  verify: (id: string) => api.get(`/prescriptions/${id}/verify`),
  inventory: () => api.get("/inventory"),
  createInventory: (payload: any) => api.post("/inventory", payload),
  updateInventory: (id: string, payload: any) => api.patch(`/inventory/${id}`, payload),
  analytics: (range: string, start?: string, end?: string) =>
    api.get(`/analytics?range=${range}${start ? `&start=${start}` : ""}${end ? `&end=${end}` : ""}`),
  reports: (payload: any) => api.post("/reports", payload, { responseType: "blob" }),
  auditLogs: (params?: any) => api.get("/audit-logs", { params }),
  startShift: (payload: { staff_name: string; staff_role: string }) => api.post("/auth/shift/start", payload),
  endShift: (shiftId: string) => api.post(`/auth/shift/end/${shiftId}`),
};
