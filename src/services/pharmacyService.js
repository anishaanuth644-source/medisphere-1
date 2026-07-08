// src/services/pharmacyService.js
//
// Handles medicines, stock ledger, pharmacy sales, and the unique
// in-house vs external purchase tracking analytics.

import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc,
  query, where, orderBy, limit, serverTimestamp, increment,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { logAuditEvent } from "./auditService";

// ─── Medicines ─────────────────────────────────────────────────────────────

export async function getMedicines() {
  const snap = await getDocs(query(collection(db, "medicines"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getLowStockMedicines() {
  // Firestore can't do `stockQuantity < reorderLevel` directly in a single
  // inequality on two fields — fetch all and filter client-side (acceptable
  // for a medicine catalog of < a few thousand items).
  const all = await getMedicines();
  return all.filter((m) => m.stockQuantity < m.reorderLevel);
}

export async function getExpiringSoonMedicines(withinDays = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + withinDays);
  const all = await getMedicines();
  return all.filter((m) => m.expiryDate?.toDate() <= threshold);
}

export async function addMedicine(data, actingUser) {
  const ref = await addDoc(collection(db, "medicines"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: actingUser.uid,
  });
  return ref.id;
}

export async function updateMedicine(medicineId, updates, actingUser) {
  await updateDoc(doc(db, "medicines", medicineId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  await logAuditEvent({
    action: "stock_update",
    userId: actingUser.uid,
    userName: actingUser.displayName,
    targetCollection: "medicines",
    targetDocId: medicineId,
    metadata: { updatedFields: Object.keys(updates) },
  });
}

// ─── Stock ledger ──────────────────────────────────────────────────────────

export async function recordStockMovement({
  medicineId, changeType, quantityDelta, reference = null, note = null,
}, actingUser) {
  // 1. Update the medicine's stockQuantity atomically
  const medRef = doc(db, "medicines", medicineId);
  const medSnap = await getDoc(medRef);
  if (!medSnap.exists()) throw new Error("Medicine not found");

  const resultingStock = medSnap.data().stockQuantity + quantityDelta;
  if (resultingStock < 0) throw new Error("Stock would go below zero");

  await updateDoc(medRef, {
    stockQuantity: increment(quantityDelta),
    updatedAt: serverTimestamp(),
  });

  // 2. Append a stock ledger entry (append-only per security rules)
  await addDoc(collection(db, "stock"), {
    medicineId,
    changeType,
    quantityDelta,
    resultingStock,
    reference,
    note,
    createdAt: serverTimestamp(),
    createdBy: actingUser.uid,
  });

  await logAuditEvent({
    action: "stock_update",
    userId: actingUser.uid,
    userName: actingUser.displayName,
    targetCollection: "medicines",
    targetDocId: medicineId,
    metadata: { changeType, quantityDelta, resultingStock },
  });
}

// ─── Pharmacy sales ────────────────────────────────────────────────────────

export async function recordPharmacySale(saleData, actingUser) {
  const ref = await addDoc(collection(db, "pharmacy_sales"), {
    ...saleData,
    soldBy: actingUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: actingUser.uid,
  });

  // Deduct stock for each sold item
  for (const item of saleData.items) {
    await recordStockMovement(
      { medicineId: item.medicineId, changeType: "sale", quantityDelta: -item.quantity, reference: ref.id },
      actingUser
    );
  }

  return ref.id;
}

// ─── In-house vs external analytics ───────────────────────────────────────

export async function getPurchaseSourceStats() {
  // Count prescriptions by purchaseSource.
  const snap = await getDocs(collection(db, "prescriptions"));
  const docs = snap.docs.map((d) => d.data());
  const total = docs.filter((d) => d.purchaseSource !== null).length;
  const inHouse = docs.filter((d) => d.purchaseSource === "in_house").length;
  const external = docs.filter((d) => d.purchaseSource === "external").length;
  return {
    total,
    inHouse,
    external,
    inHousePct: total ? Math.round((inHouse / total) * 100) : 0,
    externalPct: total ? Math.round((external / total) * 100) : 0,
  };
}

export async function getTopPrescribedMedicines(topN = 10) {
  const snap = await getDocs(collection(db, "prescriptions"));
  const countMap = {};
  snap.docs.forEach((d) => {
    d.data().items?.forEach((item) => {
      countMap[item.medicineName] = (countMap[item.medicineName] || 0) + 1;
    });
  });
  return Object.entries(countMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
