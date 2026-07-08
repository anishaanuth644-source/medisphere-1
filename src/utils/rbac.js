// src/utils/rbac.js
//
// Single source of truth for role-based access control. Both the sidebar
// navigation (UX) and ProtectedRoute (actual route guarding) read from
// this file, so adding a role or changing permissions only happens here —
// never hardcode role checks elsewhere in the UI.
//
// Reminder: this is the CLIENT-side gate. The REAL security boundary is
// firestore/firestore.rules. Never trust this file alone to protect data.

export const ROLES = {
  super_admin: { label: "Super Admin" },
  doctor: { label: "Doctor" },
  nurse: { label: "Nurse" },
  pharmacist: { label: "Pharmacist" },
  receptionist: { label: "Receptionist" },
  hr_manager: { label: "HR Manager" },
};

// Maps each role to the module keys (matching route paths under /app/*)
// it is permitted to see and use.
export const ROLE_MODULES = {
  super_admin: [
    "dashboard", "employees", "doctors", "patients", "appointments",
    "records", "pharmacy", "lab", "billing", "admissions", "emergency",
    "notifications", "feedback", "analytics", "audit",
  ],
  doctor: ["dashboard", "patients", "appointments", "records", "lab", "feedback"],
  nurse: ["dashboard", "patients", "appointments", "admissions", "emergency", "records"],
  pharmacist: ["dashboard", "pharmacy", "notifications"],
  receptionist: ["dashboard", "patients", "appointments", "billing", "admissions"],
  hr_manager: ["dashboard", "employees", "analytics"],
};

export function canAccessModule(role, moduleKey) {
  if (!role || !ROLE_MODULES[role]) return false;
  return ROLE_MODULES[role].includes(moduleKey);
}

export function defaultRouteForRole(role) {
  const modules = ROLE_MODULES[role] || ["dashboard"];
  return `/app/${modules[0] || "dashboard"}`;
}
