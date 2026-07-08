// src/services/billingService.js

import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { logAuditEvent } from "./auditService";

// ─── Invoice helpers ────────────────────────────────────────────────────────

function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const seq = Math.floor(Math.random() * 90000) + 10000;
  return `INV-${year}-${seq}`;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export async function getBillingRecords({ status } = {}) {
  let q = query(collection(db, "billing"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (status) results = results.filter((r) => r.status === status);
  return results;
}

export async function createInvoice(data, actingUser) {
  const invoiceNumber = generateInvoiceNumber();
  const ref = await addDoc(collection(db, "billing"), {
    ...data,
    invoiceNumber,
    amountPaid: 0,
    status: "Pending",
    pdfStoragePath: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: actingUser.uid,
  });
  await logAuditEvent({
    action: "billing_change",
    userId: actingUser.uid,
    userName: actingUser.displayName,
    targetCollection: "billing",
    targetDocId: ref.id,
    metadata: { invoiceNumber, amount: data.totalAmount },
  });
  return { id: ref.id, invoiceNumber };
}

export async function updateBillingStatus(billingId, status, actingUser) {
  await updateDoc(doc(db, "billing", billingId), {
    status,
    updatedAt: serverTimestamp(),
  });
  await logAuditEvent({
    action: "billing_change",
    userId: actingUser.uid,
    userName: actingUser.displayName,
    targetCollection: "billing",
    targetDocId: billingId,
    metadata: { status },
  });
}

// ─── PDF receipt generation ─────────────────────────────────────────────────
// Uses jsPDF + jspdf-autotable. The generated PDF is returned as a Blob that
// the caller can trigger a download for, or upload to Firebase Storage.

export async function generateReceiptPDF(billing) {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();

  // Header
  pdf.setFontSize(20);
  pdf.setTextColor(14, 165, 233); // sky-500
  pdf.text("MediSphere", 14, 20);
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text("Smart Digital Hospital Ecosystem", 14, 26);
  pdf.text("123 Hospital Road, Chennai, TN 600001", 14, 31);

  // Invoice title
  pdf.setFontSize(14);
  pdf.setTextColor(30);
  pdf.text("Tax Invoice / Receipt", pageW - 14, 20, { align: "right" });
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`Invoice #: ${billing.invoiceNumber}`, pageW - 14, 26, { align: "right" });
  pdf.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, pageW - 14, 31, { align: "right" });

  // Patient info
  pdf.setFontSize(10);
  pdf.setTextColor(30);
  pdf.text("Bill To:", 14, 42);
  pdf.setTextColor(60);
  pdf.text(billing.patientName, 14, 47);

  // Line items table
  pdf.autoTable({
    startY: 56,
    head: [["Description", "Amount (₹)"]],
    body: billing.items?.map((i) => [i.description, `₹${i.amount.toLocaleString("en-IN")}`]) || [],
    foot: [
      ["", ""],
      ["Total", `₹${billing.totalAmount.toLocaleString("en-IN")}`],
    ],
    headStyles: { fillColor: [14, 165, 233], textColor: 255 },
    footStyles: { fontStyle: "bold", textColor: [14, 165, 233] },
    styles: { fontSize: 10 },
    columnStyles: { 1: { halign: "right" } },
  });

  // Status badge
  const finalY = pdf.lastAutoTable.finalY + 10;
  pdf.setFontSize(10);
  pdf.setTextColor(billing.status === "Paid" ? 22 : 239, billing.status === "Paid" ? 163 : 68, billing.status === "Paid" ? 74 : 68);
  pdf.text(`Payment status: ${billing.status}`, 14, finalY);

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text("This is a computer-generated receipt. No signature required.", 14, 285);

  return pdf.output("blob");
}

// ─── CSV export ─────────────────────────────────────────────────────────────

export function exportBillingToCSV(records) {
  return records.map((r) => ({
    "Invoice #": r.invoiceNumber,
    Patient: r.patientName,
    "Amount (₹)": r.totalAmount,
    Status: r.status,
    Insurer: r.insuranceId ? "Yes" : "Self-pay",
    Date: r.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "",
  }));
}
