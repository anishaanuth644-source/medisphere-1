// src/services/auditService.js
//
// Appends a document to audit_logs on every critical action. Called by
// AuthContext (login/logout), and by other services on significant writes.
// The collection is append-only (see firestore.rules — update/delete denied).

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * @param {Object} opts
 * @param {string} opts.action          - e.g. "login" | "patient_record_update" | "stock_update"
 * @param {string} [opts.userId]        - uid of acting user (falls back to "system")
 * @param {string} [opts.userName]      - display name for quick reading in the audit list
 * @param {string} [opts.targetCollection] - which Firestore collection was affected
 * @param {string} [opts.targetDocId]   - which document was affected
 * @param {Object} [opts.metadata]      - any extra key/value context
 */
export async function logAuditEvent({
  action,
  userId = "system",
  userName = "",
  targetCollection = null,
  targetDocId = null,
  metadata = null,
}) {
  try {
    await addDoc(collection(db, "audit_logs"), {
      action,
      userId,
      userName,
      targetCollection,
      targetDocId,
      metadata,
      ipAddress: null, // IP cannot be reliably obtained client-side; use Cloud Functions for server-side IP capture
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Audit failure must never crash the calling feature —
    // log to console and continue.
    console.error("[Audit] Failed to write audit log:", err);
  }
}
