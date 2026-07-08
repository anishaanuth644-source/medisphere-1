// src/services/appointmentService.js

import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { logAuditEvent } from "./auditService";

const COL = "appointments";

export async function getAppointments({ date, doctorId, status } = {}) {
  let q = query(collection(db, COL), orderBy("scheduledAt", "asc"));

  // Narrow by date (same-day appointments)
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    q = query(
      collection(db, COL),
      where("scheduledAt", ">=", Timestamp.fromDate(start)),
      where("scheduledAt", "<=", Timestamp.fromDate(end)),
      orderBy("scheduledAt", "asc")
    );
  }

  const snap = await getDocs(q);
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (doctorId) results = results.filter((a) => a.doctorId === doctorId);
  if (status) results = results.filter((a) => a.status === status);

  return results;
}

export async function getDoctorSlots(doctorId, date) {
  // Returns existing appointments for a doctor on a given date so the
  // booking UI can show which slots are taken.
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, COL),
    where("doctorId", "==", doctorId),
    where("scheduledAt", ">=", Timestamp.fromDate(start)),
    where("scheduledAt", "<=", Timestamp.fromDate(end)),
    where("status", "not-in", ["Cancelled"])
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().scheduledAt.toDate());
}

export async function scheduleAppointment(data, actingUser) {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    status: "Confirmed",
    reminderSentAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: actingUser.uid,
  });
  return ref.id;
}

export async function updateAppointmentStatus(appointmentId, status, actingUser) {
  await updateDoc(doc(db, COL, appointmentId), {
    status,
    updatedAt: serverTimestamp(),
  });
  await logAuditEvent({
    action: "appointment_status_update",
    userId: actingUser.uid,
    userName: actingUser.displayName,
    targetCollection: COL,
    targetDocId: appointmentId,
    metadata: { status },
  });
}

export async function cancelAppointment(appointmentId, actingUser) {
  return updateAppointmentStatus(appointmentId, "Cancelled", actingUser);
}
