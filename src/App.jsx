// src/App.jsx  — complete router with all 15 modules wired to real page components

import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";
import { Spinner } from "./components/ui/index";
import { LoginPage } from "./pages/auth/LoginPage";

// ── Lazy-load every page module ──────────────────────────────────────────────
// Each role only downloads the bundle for pages it can actually reach.

const DashboardPage     = lazy(() => import("./pages/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })));
const PatientsPage      = lazy(() => import("./pages/patients/PatientsPage").then(m => ({ default: m.PatientsPage })));
const AppointmentsPage  = lazy(() => import("./pages/appointments/AppointmentsPage").then(m => ({ default: m.AppointmentsPage })));
const DoctorsPage       = lazy(() => import("./pages/doctors/DoctorsPage").then(m => ({ default: m.DoctorsPage })));
const EmployeesPage     = lazy(() => import("./pages/employees/EmployeesPage").then(m => ({ default: m.EmployeesPage })));
const RecordsPage       = lazy(() => import("./pages/records/RecordsPage").then(m => ({ default: m.RecordsPage })));
const PharmacyPage      = lazy(() => import("./pages/pharmacy/PharmacyPage").then(m => ({ default: m.PharmacyPage })));
const LabPage           = lazy(() => import("./pages/lab/LabPage").then(m => ({ default: m.LabPage })));
const BillingPage       = lazy(() => import("./pages/billing/BillingPage").then(m => ({ default: m.BillingPage })));
const AdmissionsPage    = lazy(() => import("./pages/admissions/AdmissionsPage").then(m => ({ default: m.AdmissionsPage })));
const EmergencyPage     = lazy(() => import("./pages/emergency/EmergencyPage").then(m => ({ default: m.EmergencyPage })));
const AnalyticsPage     = lazy(() => import("./pages/analytics/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const FeedbackPage      = lazy(() => import("./pages/feedback/FeedbackPage").then(m => ({ default: m.FeedbackPage })));
const NotificationsPage = lazy(() => import("./pages/notifications/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const AuditPage         = lazy(() => import("./pages/audit/AuditPage").then(m => ({ default: m.AuditPage })));

// ── Page wrapper: ProtectedRoute + AppLayout + Suspense in one go ────────────
function Page({ moduleKey, children }) {
  return (
    <ProtectedRoute moduleKey={moduleKey}>
      <AppLayout>
        <Suspense
          fallback={
            <div className="flex items-center justify-center pt-24">
              <Spinner size={36} />
            </div>
          }
        >
          {children}
        </Suspense>
      </AppLayout>
    </ProtectedRoute>
  );
}

// ── Root app ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { borderRadius: "12px", fontSize: "14px" },
            success: { iconTheme: { primary: "#0ea5e9", secondary: "#fff" } },
          }}
        />

        <Routes>
          {/* ── Public ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

          {/* ── Protected: one route per module ── */}
          <Route path="/app/dashboard"
            element={<Page moduleKey="dashboard"><DashboardPage /></Page>} />

          <Route path="/app/patients"
            element={<Page moduleKey="patients"><PatientsPage /></Page>} />

          <Route path="/app/appointments"
            element={<Page moduleKey="appointments"><AppointmentsPage /></Page>} />

          <Route path="/app/doctors"
            element={<Page moduleKey="doctors"><DoctorsPage /></Page>} />

          <Route path="/app/employees"
            element={<Page moduleKey="employees"><EmployeesPage /></Page>} />

          <Route path="/app/records"
            element={<Page moduleKey="records"><RecordsPage /></Page>} />

          <Route path="/app/pharmacy"
            element={<Page moduleKey="pharmacy"><PharmacyPage /></Page>} />

          <Route path="/app/lab"
            element={<Page moduleKey="lab"><LabPage /></Page>} />

          <Route path="/app/billing"
            element={<Page moduleKey="billing"><BillingPage /></Page>} />

          <Route path="/app/admissions"
            element={<Page moduleKey="admissions"><AdmissionsPage /></Page>} />

          <Route path="/app/emergency"
            element={<Page moduleKey="emergency"><EmergencyPage /></Page>} />

          <Route path="/app/analytics"
            element={<Page moduleKey="analytics"><AnalyticsPage /></Page>} />

          <Route path="/app/feedback"
            element={<Page moduleKey="feedback"><FeedbackPage /></Page>} />

          <Route path="/app/notifications"
            element={<Page moduleKey="notifications"><NotificationsPage /></Page>} />

          <Route path="/app/audit"
            element={<Page moduleKey="audit"><AuditPage /></Page>} />

          {/* ── Fallback: redirect unknown paths to dashboard ── */}
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
