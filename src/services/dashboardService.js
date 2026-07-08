// src/services/dashboardService.js
//
// Fetches all KPI data the dashboard needs in one coordinated call.
// For a production system with many records, consider replacing these
// collection scans with Cloud Functions that pre-aggregate stats into a
// dedicated `dashboard_stats` document updated on a schedule or via
// Firestore triggers.

import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { getLowStockMedicines, getExpiringSoonMedicines } from "./pharmacyService";

export async function getDashboardKPIs() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    patientsSnap,
    todayAptsSnap,
    roomsSnap,
    doctorsSnap,
    emergencySnap,
    lowStockMeds,
    expiringMeds,
    billingSnap,
    attendanceSnap,
  ] = await Promise.all([
    getDocs(collection(db, "patients")),
    getDocs(query(
      collection(db, "appointments"),
      where("scheduledAt", ">=", Timestamp.fromDate(todayStart)),
      where("scheduledAt", "<=", Timestamp.fromDate(todayEnd))
    )),
    getDocs(collection(db, "rooms")),
    getDocs(query(collection(db, "doctors"), where("active", "==", true))),
    getDocs(query(collection(db, "emergency_cases"), where("status", "in", ["Incoming", "In ER"]))),
    getLowStockMedicines(),
    getExpiringSoonMedicines(30),
    getDocs(query(collection(db, "billing"), where("status", "==", "Insurance review"))),
    getDocs(query(
      collection(db, "attendance"),
      where("date", ">=", Timestamp.fromDate(todayStart)),
      where("date", "<=", Timestamp.fromDate(todayEnd))
    )),
  ]);

  const rooms = roomsSnap.docs.map((d) => d.data());
  const totalBeds = rooms.length;
  const availableBeds = rooms.filter((r) => r.status === "available").length;

  const attendance = attendanceSnap.docs.map((d) => d.data());
  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attendancePct = attendance.length
    ? Math.round((presentCount / attendance.length) * 100)
    : 0;

  return {
    totalPatients: patientsSnap.size,
    todayAppointments: todayAptsSnap.size,
    availableBeds,
    totalBeds,
    activeDoctors: doctorsSnap.size,
    emergencyCases: emergencySnap.size,
    lowStockCount: lowStockMeds.length,
    expiringSoonCount: expiringMeds.length,
    pendingInsuranceClaims: billingSnap.size,
    attendancePct,
    // Daily revenue requires summing pharmacy_sales + billing for today —
    // best computed server-side via a Cloud Function for accuracy at scale.
    dailyRevenue: null,
  };
}

export async function getRevenueTrend(months = 6) {
  // Simplified: fetch last N months of billing and sum by month.
  // For production, use a Cloud Function that writes monthly rollups.
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const snap = await getDocs(query(
    collection(db, "billing"),
    where("status", "==", "Paid"),
    where("createdAt", ">=", Timestamp.fromDate(cutoff))
  ));
  const byMonth = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const date = data.createdAt?.toDate?.();
    if (!date) return;
    const key = date.toLocaleString("en-IN", { month: "short", year: "numeric" });
    byMonth[key] = (byMonth[key] || 0) + (data.totalAmount || 0);
  });
  return Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue }));
}
