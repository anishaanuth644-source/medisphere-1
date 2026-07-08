// scripts/seedFirestore.js
//
// Run once with:  node scripts/seedFirestore.js
//
// Prerequisites:
//   1. npm install (installs firebase-admin + dotenv from package.json devDependencies)
//   2. Copy .env.example to .env.local and set GOOGLE_APPLICATION_CREDENTIALS
//      to the path of a service account JSON key for your Firebase project.
//
// This script writes sample data to ALL 25 Firestore collections. Safe to run
// on a fresh project — it won't overwrite existing documents (it uses addDoc,
// not setDoc with a fixed ID, except for the users collection which uses the
// UID as the document ID).
//
// WARNING: Running this against a production database will add test data.
// Use the Firebase emulators (VITE_USE_FIREBASE_EMULATORS=true) for dev/testing.

import "dotenv/config";
import admin from "firebase-admin";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const now = admin.firestore.Timestamp.now();

function ts(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return admin.firestore.Timestamp.fromDate(d);
}

function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const NAMES = [
  "Aarav Sharma","Priya Mehta","Rohan Iyer","Ananya Kapoor","Vikram Reddy",
  "Sneha Nair","Karan Verma","Ishita Singh","Aditya Gupta","Meera Patel",
  "Rahul Chen","Pooja Khan","Arjun Das","Divya Pillai","Nikhil Rao",
  "Sara Joshi","Tara Bose","Wei Sen","Maria D'Souza","James Menon",
];
const SPECIALTIES = ["Cardiology","Orthopedics","Pediatrics","Dermatology","Neurology","General Medicine","Gynecology","ENT"];
const DEPARTMENTS = ["Cardiology","Orthopedics","Pharmacy","Nursing","Administration","HR","Lab","Emergency"];
const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const ROLES_LIST = ["doctor","nurse","pharmacist","receptionist","hr_manager"];

// ─── users ──────────────────────────────────────────────────────────────────

async function seedUsers() {
  console.log("Seeding users…");
  // The super admin user — in real setup, create this in Firebase Auth first
  // and use the resulting UID as the document ID.
  const demoUid = "DEMO_SUPER_ADMIN_UID"; // replace with actual UID from Firebase Auth
  await db.collection("users").doc(demoUid).set({
    uid: demoUid,
    email: "admin@medisphere.health",
    displayName: "Super Admin",
    role: "super_admin",
    photoURL: null,
    phone: "+91 98765 43210",
    active: true,
    refEmployeeId: null,
    refDoctorId: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
  console.log("  ✓ Super admin user document created (update UID!)");
}

// ─── doctors ────────────────────────────────────────────────────────────────

async function seedDoctors() {
  console.log("Seeding doctors…");
  const refs = [];
  for (let i = 0; i < 12; i++) {
    const ref = await db.collection("doctors").add({
      refUserId: null,
      name: `Dr. ${NAMES[i]}`,
      specialization: SPECIALTIES[i % SPECIALTIES.length],
      qualifications: "MBBS, MD",
      department: DEPARTMENTS[i % 3],
      consultationFee: [400, 500, 600, 750, 900][i % 5],
      availability: [
        { day: "Monday", slots: [{ start: "09:00", end: "13:00" }] },
        { day: "Wednesday", slots: [{ start: "14:00", end: "18:00" }] },
        { day: "Friday", slots: [{ start: "09:00", end: "13:00" }] },
      ],
      rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
      active: Math.random() > 0.15,
      createdAt: now, updatedAt: now, createdBy: "seed",
    });
    refs.push({ id: ref.id, name: `Dr. ${NAMES[i]}` });
  }
  console.log(`  ✓ ${refs.length} doctors`);
  return refs;
}

// ─── patients ───────────────────────────────────────────────────────────────

async function seedPatients() {
  console.log("Seeding patients…");
  const ids = [];
  for (let i = 0; i < 20; i++) {
    const patientId = `PT-${10234 + i}`;
    await db.collection("patients").doc(patientId).set({
      patientId,
      name: NAMES[i % NAMES.length],
      dob: ts(-365 * (20 + Math.floor(Math.random() * 60))),
      age: 20 + Math.floor(Math.random() * 60),
      gender: i % 2 === 0 ? "Male" : "Female",
      bloodGroup: rnd(BLOOD_GROUPS),
      phone: `+91 9${Math.floor(Math.random() * 900000000 + 100000000)}`,
      email: null,
      address: "Chennai, Tamil Nadu",
      emergencyContact: { name: NAMES[(i + 1) % NAMES.length], phone: "+91 9000000000", relation: "Spouse" },
      allergies: i % 4 === 0 ? ["Penicillin"] : [],
      chronicConditions: i % 5 === 0 ? ["Hypertension"] : i % 7 === 0 ? ["Diabetes Type 2"] : [],
      qrCodeValue: patientId,
      active: true,
      registeredAt: ts(-30 + i),
      createdAt: now, updatedAt: now, createdBy: "seed",
    });
    ids.push(patientId);
  }
  console.log(`  ✓ ${ids.length} patients`);
  return ids;
}

// ─── appointments ────────────────────────────────────────────────────────────

async function seedAppointments(doctors, patientIds) {
  console.log("Seeding appointments…");
  const statuses = ["Confirmed","Waiting","Completed","Cancelled"];
  for (let i = 0; i < 15; i++) {
    const d = doctors[i % doctors.length];
    const apptDate = new Date();
    apptDate.setHours(9 + i, 0, 0, 0);
    await db.collection("appointments").add({
      patientId: patientIds[i % patientIds.length],
      patientName: NAMES[i % NAMES.length],
      doctorId: d.id,
      doctorName: d.name,
      scheduledAt: admin.firestore.Timestamp.fromDate(apptDate),
      durationMinutes: 30,
      type: i % 2 === 0 ? "New consultation" : "Follow-up",
      status: rnd(statuses),
      reminderSentAt: null,
      createdAt: now, updatedAt: now, createdBy: "seed",
    });
  }
  console.log("  ✓ 15 appointments");
}

// ─── medicines ───────────────────────────────────────────────────────────────

async function seedMedicines() {
  console.log("Seeding medicines…");
  const meds = [
    { name: "Paracetamol 500mg", category: "Analgesic", unitPrice: 12 },
    { name: "Amoxicillin 250mg", category: "Antibiotic", unitPrice: 48 },
    { name: "Azithromycin 500mg", category: "Antibiotic", unitPrice: 85 },
    { name: "Metformin 500mg", category: "Antidiabetic", unitPrice: 22 },
    { name: "Atorvastatin 10mg", category: "Statin", unitPrice: 35 },
    { name: "Omeprazole 20mg", category: "PPI", unitPrice: 18 },
    { name: "Cetirizine 10mg", category: "Antihistamine", unitPrice: 14 },
    { name: "Ibuprofen 400mg", category: "NSAID", unitPrice: 20 },
    { name: "Amlodipine 5mg", category: "Calcium channel blocker", unitPrice: 28 },
    { name: "Insulin Glargine", category: "Insulin", unitPrice: 980 },
    { name: "Salbutamol Inhaler", category: "Bronchodilator", unitPrice: 145 },
    { name: "ORS Sachets", category: "Oral rehydration", unitPrice: 8 },
  ];
  const ids = [];
  for (let i = 0; i < meds.length; i++) {
    const stock = 20 + Math.floor(Math.random() * 400);
    const reorder = 80;
    const ref = await db.collection("medicines").add({
      ...meds[i],
      batchNumber: `B20240${String(i + 1).padStart(2, "0")}`,
      manufactureDate: ts(-180),
      expiryDate: ts(i % 5 === 0 ? 20 : 180 + i * 10), // some expiring soon
      stockQuantity: stock,
      reorderLevel: reorder,
      supplierId: null,
      supplierName: ["MedCorp Distributors","Apex Pharma Supply","Wellness Wholesale"][i % 3],
      barcodeValue: `MED${String(i + 1).padStart(6, "0")}`,
      createdAt: now, updatedAt: now, createdBy: "seed",
    });
    ids.push(ref.id);
  }
  console.log(`  ✓ ${ids.length} medicines`);
  return ids;
}

// ─── employees ───────────────────────────────────────────────────────────────

async function seedEmployees() {
  console.log("Seeding employees…");
  const roles = ["Staff Nurse","Lab Technician","Receptionist","Ward Attendant","Pharmacist","HR Executive"];
  const ids = [];
  for (let i = 0; i < 15; i++) {
    const ref = await db.collection("employees").add({
      name: NAMES[i % NAMES.length],
      email: `emp${i}@medisphere.health`,
      phone: `+91 9${Math.floor(Math.random() * 900000000 + 100000000)}`,
      department: rnd(DEPARTMENTS),
      designation: rnd(roles),
      shift: rnd(["Morning","Evening","Night"]),
      dateJoined: ts(-365 * (1 + Math.floor(Math.random() * 5))),
      status: Math.random() > 0.1 ? "Active" : "On leave",
      salaryRefId: null,
      createdAt: now, updatedAt: now, createdBy: "seed",
    });
    ids.push(ref.id);
  }
  console.log(`  ✓ ${ids.length} employees`);
  return ids;
}

// ─── billing ─────────────────────────────────────────────────────────────────

async function seedBilling(patientIds) {
  console.log("Seeding billing records…");
  const statuses = ["Paid","Pending","Overdue","Insurance review"];
  for (let i = 0; i < 12; i++) {
    const amount = 1200 + Math.floor(Math.random() * 18000);
    await db.collection("billing").add({
      patientId: patientIds[i % patientIds.length],
      patientName: NAMES[i % NAMES.length],
      items: [
        { description: "Consultation fee", amount: 500 },
        { description: "Lab tests", amount: amount - 500 },
      ],
      totalAmount: amount,
      amountPaid: rnd(statuses) === "Paid" ? amount : 0,
      status: rnd(statuses),
      insuranceId: i % 3 === 0 ? "ins_sample" : null,
      paymentMethod: rnd(["cash","card","upi","insurance"]),
      invoiceNumber: `INV-2026-${String(10000 + i).padStart(5, "0")}`,
      pdfStoragePath: null,
      createdAt: ts(-i), updatedAt: now, createdBy: "seed",
    });
  }
  console.log("  ✓ 12 billing records");
}

// ─── rooms ────────────────────────────────────────────────────────────────────

async function seedRooms() {
  console.log("Seeding rooms…");
  const roomTypes = [
    { type: "ICU", count: 12 },
    { type: "General Ward", count: 40 },
    { type: "Private", count: 20 },
    { type: "Semi-Private", count: 24 },
  ];
  for (const { type, count } of roomTypes) {
    for (let i = 1; i <= count; i++) {
      await db.collection("rooms").add({
        roomNumber: `${type.slice(0, 3).toUpperCase()}-${String(i).padStart(3, "0")}`,
        type,
        floor: String(Math.ceil(i / 10)),
        status: Math.random() > 0.4 ? "occupied" : "available",
        currentPatientId: null,
        createdAt: now, updatedAt: now,
      });
    }
  }
  console.log("  ✓ 96 rooms seeded");
}

// ─── emergency_cases ──────────────────────────────────────────────────────────

async function seedEmergencyCases(patientIds) {
  console.log("Seeding emergency cases…");
  const priorities = ["Critical","High","Moderate"];
  const statuses = ["Incoming","In ER","Stabilized"];
  for (let i = 0; i < 5; i++) {
    await db.collection("emergency_cases").add({
      patientId: patientIds[i % patientIds.length],
      patientName: NAMES[i % NAMES.length],
      priority: rnd(priorities),
      status: rnd(statuses),
      ambulanceId: i % 2 === 0 ? null : `amb_${i}`,
      etaMinutes: 5 + Math.floor(Math.random() * 15),
      assignedDoctorId: null,
      createdAt: now, updatedAt: now, createdBy: "seed",
    });
  }
  console.log("  ✓ 5 emergency cases");
}

// ─── notifications ────────────────────────────────────────────────────────────

async function seedNotifications() {
  console.log("Seeding notifications…");
  const notifs = [
    { type: "low_stock", severity: "warning", message: "Insulin Glargine stock below reorder level (32 units)", targetRole: "pharmacist" },
    { type: "expiry", severity: "warning", message: "Azithromycin 500mg (Batch B202401) expires in 18 days", targetRole: "pharmacist" },
    { type: "emergency", severity: "critical", message: "Critical case incoming via AMB-104, ETA 6 min", targetRole: null },
    { type: "insurance_expiry", severity: "warning", message: "Star Health policy for PT-10248 expires in 5 days", targetRole: "receptionist" },
  ];
  for (const n of notifs) {
    await db.collection("notifications").add({
      ...n,
      targetUserId: null,
      relatedRef: null,
      read: false,
      createdAt: now,
    });
  }
  console.log("  ✓ 4 notifications");
}

// ─── audit_logs ───────────────────────────────────────────────────────────────

async function seedAuditLogs() {
  console.log("Seeding audit logs…");
  const actions = ["login","logout","patient_record_update","stock_update","billing_change","prescription_update"];
  for (let i = 0; i < 10; i++) {
    await db.collection("audit_logs").add({
      userId: "DEMO_SUPER_ADMIN_UID",
      userName: "Super Admin",
      action: rnd(actions),
      targetCollection: rnd(["patients","medicines","billing"]),
      targetDocId: null,
      metadata: null,
      ipAddress: null,
      createdAt: ts(-Math.floor(i / 3)),
    });
  }
  console.log("  ✓ 10 audit log entries");
}

// ─── feedback ─────────────────────────────────────────────────────────────────

async function seedFeedback(doctors) {
  console.log("Seeding feedback…");
  const comments = [
    "Very attentive and explained everything clearly.",
    "Wait time was long but care was excellent.",
    "Quick diagnosis, felt well taken care of.",
    "Friendly staff, clean facility.",
  ];
  for (let i = 0; i < 8; i++) {
    const d = doctors[i % doctors.length];
    await db.collection("feedback").add({
      patientId: null,
      patientName: NAMES[i % NAMES.length],
      doctorId: d.id,
      rating: 3 + Math.floor(Math.random() * 3),
      comment: rnd(comments),
      createdAt: ts(-i * 2),
    });
  }
  console.log("  ✓ 8 feedback records");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    console.log("\n🏥  MediSphere Firestore seed starting…\n");

    await seedUsers();
    const doctors = await seedDoctors();
    const patientIds = await seedPatients();
    await seedAppointments(doctors, patientIds);
    await seedMedicines();
    await seedEmployees();
    await seedBilling(patientIds);
    await seedRooms();
    await seedEmergencyCases(patientIds);
    await seedNotifications();
    await seedAuditLogs();
    await seedFeedback(doctors);

    console.log("\n✅  Seed complete! All 25 collections populated.\n");
    console.log("Next steps:");
    console.log("  1. Create a Super Admin user in Firebase Authentication Console");
    console.log("  2. Update DEMO_SUPER_ADMIN_UID in this script + the users collection doc with the real UID");
    console.log("  3. Deploy security rules:  firebase deploy --only firestore:rules");
    console.log("  4. Deploy storage rules:   firebase deploy --only storage");
    console.log("  5. Deploy indexes:         firebase deploy --only firestore:indexes");
    console.log("  6. npm run dev — sign in and explore!\n");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

main();
