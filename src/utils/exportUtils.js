// src/utils/exportUtils.js
//
// Client-side CSV and PDF export helpers used by table components.

import Papa from "papaparse";

/**
 * Triggers a CSV download of an array of plain objects.
 * @param {Array<Object>} rows - Each key becomes a column header.
 * @param {string} filename    - e.g. "patients-export.csv"
 */
export function downloadCSV(rows, filename = "export.csv") {
  if (!rows.length) return;
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Formats a Firestore Timestamp (or Date) for display in exports.
 */
export function formatDate(ts) {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Converts patients to flat export rows.
 */
export function patientsToExportRows(patients) {
  return patients.map((p) => ({
    "Patient ID": p.id,
    Name: p.name,
    Age: p.age,
    Gender: p.gender,
    "Blood Group": p.bloodGroup,
    Phone: p.phone,
    Allergies: p.allergies?.join(", ") || "",
    "Chronic Conditions": p.chronicConditions?.join(", ") || "",
    "Registered At": formatDate(p.registeredAt),
  }));
}
