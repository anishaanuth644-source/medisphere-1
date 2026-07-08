// src/utils/idGenerators.js
//
// Human-readable ID generators used throughout the app. These are generated
// client-side. Because Firestore has no auto-increment, we use a prefix +
// timestamp + random suffix pattern that is collision-resistant at hospital
// scale (<10k new patients/day) without needing a counter document.

/**
 * Generates a patient ID like PT-10234.
 * The numeric part starts at 10000 so all IDs are the same visual length.
 */
export function generatePatientId() {
  const base = 10000 + Math.floor(Math.random() * 89999);
  return `PT-${base}`;
}

/**
 * Generates a short lab test ID like LAB-202606-A3F9.
 */
export function generateLabId() {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LAB-${ym}-${suffix}`;
}

/**
 * Generates an employee ID like EMP-2026-00142.
 */
export function generateEmployeeId() {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 90000) + 10000).padStart(5, "0");
  return `EMP-${year}-${seq}`;
}
