import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ProtectedRoute   from "./routes/ProtectedRoute";
import RootLayout       from "./routes/RootLayout";

import LandingPage        from "./pages/LandingPage";
import LoginPage          from "./pages/LoginPage";
import RegisterPage       from "./pages/RegisterPage";
import CaseSearchPage     from "./pages/CaseSearchPage";
import CaseDetailPage     from "./pages/CaseDetailPage";
import PricingPage        from "./pages/PricingPage";
import DashboardPage      from "./pages/DashboardPage";
import AdvocateDashboard  from "./pages/AdvocateDashboard";
import NotificationCenter from "./pages/NotificationCenter";
import SettingsPage       from "./pages/SettingsPage";
import AdminCasesPage     from "./pages/AdminCasesPage";
import AdminCaseEditPage  from "./pages/AdminCaseEditPage";
import AdminSystemPage    from "./pages/AdminSystemPage";
import NotFoundPage       from "./pages/NotFoundPage";

/** Renders the correct dashboard based on the user's role. */
function SmartDashboard() {
  const { user } = useAuth();
  if (user?.role === "ADVOCATE") return <AdvocateDashboard />;
  if (user?.role === "COURT_ADMIN") return <AdminCasesPage />;
  if (user?.role === "SYS_ADMIN") return <AdminSystemPage />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RootLayout />}>
            {/* ── Public ─────────────────────────────────────────────────── */}
            <Route index          element={<LandingPage />} />
            <Route path="login"   element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="search"  element={<CaseSearchPage />} />
            <Route path="cases/:id" element={<CaseDetailPage />} />
            <Route path="pricing" element={<PricingPage />} />

            {/* ── Authenticated ──────────────────────────────────────────── */}
            <Route path="dashboard" element={
              <ProtectedRoute><SmartDashboard /></ProtectedRoute>
            } />
            <Route path="notifications" element={
              <ProtectedRoute><NotificationCenter /></ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            } />

            {/* ── Court Admin ────────────────────────────────────────────── */}
            <Route path="admin/cases" element={
              <ProtectedRoute roles={["COURT_ADMIN", "SYS_ADMIN"]}>
                <AdminCasesPage />
              </ProtectedRoute>
            } />
            <Route path="admin/cases/:id" element={
              <ProtectedRoute roles={["COURT_ADMIN", "SYS_ADMIN"]}>
                <AdminCaseEditPage />
              </ProtectedRoute>
            } />

            {/* ── System Admin ───────────────────────────────────────────── */}
            <Route path="admin/system" element={
              <ProtectedRoute roles={["SYS_ADMIN"]}>
                <AdminSystemPage />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
