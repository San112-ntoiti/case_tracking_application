import api from "./client";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post("/auth/register/", data),
  login: (data) => api.post("/auth/login/", data),
  logout: (refresh) => api.post("/auth/logout/", { refresh }),
  getProfile: () => api.get("/auth/profile/"),
  updateProfile: (data) => api.patch("/auth/profile/", data),
  changePassword: (data) => api.post("/auth/change-password/", data),
};

// ─── Cases ────────────────────────────────────────────────────────────────────
export const casesApi = {
  search: (params) => api.get("/cases/", { params }),
  getDetail: (id) => api.get(`/cases/${id}/`),
  getEvents: (caseId) => api.get(`/cases/${caseId}/events/`),
  getCourts: () => api.get("/cases/courts/"),

  getTracked: () => api.get("/cases/tracked/"),
  trackCase: (caseId) => api.post("/cases/tracked/", { case: caseId }),
  untrackCase: (trackedId) => api.delete(`/cases/tracked/${trackedId}/`),

  // Reports
  downloadTrackedCSV: () => api.get("/cases/reports/tracked/?export=csv", { responseType: "blob" }),
  downloadTrackedPDF: () => api.get("/cases/reports/tracked/?export=pdf", { responseType: "blob" }),
  downloadActivityCSV: () => api.get("/cases/reports/activity/?export=csv", { responseType: "blob" }),

  // Court Admin
  adminList: (params) => api.get("/cases/admin/", { params }),
  adminGet: (id) => api.get(`/cases/admin/${id}/`),
  adminCreate: (data) => api.post("/cases/admin/", data),
  adminUpdate: (id, data) => api.patch(`/cases/admin/${id}/`, data),
  adminAddEvent: (caseId, data) => api.post(`/cases/admin/${caseId}/events/`, data),
  adminUploadDocument: (caseId, formData) =>
    api.post(`/cases/admin/${caseId}/documents/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ─── Billing ──────────────────────────────────────────────────────────────────
export const billingApi = {
  getProducts: () => api.get("/billing/products/"),
  createOrder: (productId, provider = "MOCK") =>
    api.post("/billing/orders/", { product: productId, provider }),
  initiateSTKPush: (orderId, phoneNumber) =>
    api.post("/billing/mpesa/stk-push/", { order_id: orderId, phone_number: phoneNumber }),
  confirmMock: (orderId) => api.post("/billing/mock/confirm/", { order_id: orderId }),
  getSubscription: () => api.get("/billing/subscription/"),
  cancelSubscription: () => api.post("/billing/subscription/cancel/"),
  getRevenue: (params) => api.get("/billing/revenue/", { params }),
  adminGetOrders: (params) => api.get("/billing/admin/orders/", { params }),
  adminGetSubscriptions: (params) => api.get("/billing/admin/subscriptions/", { params }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (params) => api.get("/notifications/", { params }),
  getPreferences: () => api.get("/notifications/preferences/"),
  updatePreferences: (data) => api.patch("/notifications/preferences/", data),
  sendTest: () => api.post("/notifications/test/"),
  markSent: (id) => api.post(`/notifications/${id}/mark-sent/`),
};

// ─── Admin (System Admin) ─────────────────────────────────────────────────────
export const adminApi = {
  getUsers: (params) => api.get("/auth/admin/users/", { params }),
  updateUser: (id, data) => api.patch(`/auth/admin/users/${id}/`, data),
  getAuditLogs: (params) => api.get("/admin-panel/audit-logs/", { params }),
};
