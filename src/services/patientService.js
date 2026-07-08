// src/services/patientService.js

import {
  collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { logAuditEvent } from "./auditService";
import { generatePatientId } from "../utils/idGenerators";

const COL = "patients";

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getPatient(patientId) {
  const snap = await getDoc(doc(db, COL, patientId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllPatients({ limitCount = 200 } = {}) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function searchPatients(searchTerm) {
  // Firestore doesn't support full-text search natively. For production scale,
  // integrate Algolia or Typesense. This helper does a basic prefix scan on
  // `name` — sufficient for small lists, but paginate carefully for large DBs.
  const all = await getAllPatients({ limitCount: 500 });
  const term = searchTerm.toLowerCase();
  return all.filter(
    (p) =>
      p.name?.toLowerCase().includes(term) ||
      p.id?.toLowerCase().includes(term) ||
      p.phone?.includes(term)
  );
}

// ─── Write ─────────────────────────────────────────────────────────────────

export async function registerPatient(data, actingUser) {
  const patientId = generatePatientId();
  const payload = {
    ...data,
    patientId,
    qrCodeValue: patientId,
    registeredAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: actingUser.uid,
  };
  // Custom document ID = the human-readable patient ID (e.g. PT-10234)
  const ref = doc(db, COL, patientId);
  await setDoc(ref, payload);

  await logAuditEvent({
    action: "patient_registered",
    userId: actingUser.uid,
    userName: actingUser.displayName,
    targetCollection: COL,
    targetDocId: patientId,
  });

  return patientId;
}

export async function updatePatient(patientId, updates, actingUser) {
  const ref = doc(db, COL, patientId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  await logAuditEvent({
    action: "patient_record_update",
    userId: actingUser.uid,
    userName: actingUser.displayName,
    targetCollection: COL,
    targetDocId: patientId,
    metadata: { updatedFields: Object.keys(updates) },
  });
}

export async function deactivatePatient(patientId, actingUser) {
  await updatePatient(patientId, { active: false }, actingUser);
}
