# MediSphere Firestore schema

This document defines the shape of every Firestore collection used by
MediSphere. It is the source of truth for `src/services/*.js` (which read
and write these shapes) and for `scripts/seedFirestore.js` (which creates
sample documents matching these shapes).

Conventions:
- All documents include `createdAt` / `updatedAt` as Firestore `Timestamp`.
- All documents include `createdBy` (uid of the user who created the
  record) for audit purposes.
- IDs in `_id` fields below are auto-generated Firestore document IDs
  unless noted as a custom ID (e.g. patients use a custom human-readable ID).
- Fields marked `ref:` store a Firestore document path/id, not an embedded
  object — always resolve via the corresponding service, never assume the
  related document is inlined.

---

## users
Mirrors Firebase Auth users with role + profile metadata. Document ID = Auth UID.

```
users/{uid}
  uid              string
  email            string
  displayName      string
  role             string   // "super_admin" | "doctor" | "nurse" | "pharmacist" | "receptionist" | "hr_manager"
  photoURL         string | null
  phone            string | null
  active           boolean
  refEmployeeId    string | null   // ref: employees/{id}, if this user is staff
  refDoctorId      string | null   // ref: doctors/{id}, if this user is a doctor
  lastLoginAt      Timestamp | null
  createdAt        Timestamp
  updatedAt        Timestamp
```

## employees
```
employees/{id}
  name             string
  email            string
  phone            string
  department       string   // "Cardiology" | "Pharmacy" | "Nursing" | "Administration" | "HR" | "Lab" | "Emergency" | ...
  designation      string
  shift            string   // "Morning" | "Evening" | "Night"
  dateJoined       Timestamp
  status           string   // "Active" | "On leave" | "Deactivated"
  salaryRefId      string | null  // ref: salary/{id}
  createdAt / updatedAt / createdBy
```

## doctors
```
doctors/{id}
  refUserId        string | null   // ref: users/{uid}
  name             string
  specialization   string
  qualifications   string
  department        string
  consultationFee  number
  availability     array<{ day: string, slots: array<{start: string, end: string}> }>
  rating           number          // derived/aggregated from feedback collection
  active           boolean
  createdAt / updatedAt / createdBy
```

## patients
Document ID is a custom human-readable patient ID (e.g. `PT-10234`), generated
client-side via `generatePatientId()` in `src/utils/idGenerators.js`.

```
patients/{patientId}
  patientId        string   // duplicate of doc id for query convenience
  name             string
  dob              Timestamp
  age              number   // derived at write time for quick display; recompute on read for accuracy
  gender           string
  bloodGroup       string
  phone            string
  email            string | null
  address          string | null
  emergencyContact { name: string, phone: string, relation: string }
  allergies        array<string>
  chronicConditions array<string>
  qrCodeValue      string   // encodes patientId, used by qrcode.react on the patient card
  registeredAt     Timestamp
  createdAt / updatedAt / createdBy
```

## medical_records
```
medical_records/{id}
  patientId        string   // ref: patients/{patientId}
  doctorId         string   // ref: doctors/{id}
  appointmentId    string | null  // ref: appointments/{id}
  visitDate        Timestamp
  diagnosis        string
  treatmentPlan    string
  notes            string
  attachments      array<{ name: string, url: string, storagePath: string, uploadedAt: Timestamp }>
  createdAt / updatedAt / createdBy
```

## appointments
```
appointments/{id}
  patientId        string   // ref: patients/{patientId}
  patientName      string   // denormalized for list display without a join
  doctorId         string   // ref: doctors/{id}
  doctorName       string   // denormalized
  scheduledAt      Timestamp
  durationMinutes  number
  type             string   // "New consultation" | "Follow-up"
  status           string   // "Confirmed" | "Waiting" | "In consultation" | "Completed" | "Cancelled"
  reminderSentAt   Timestamp | null
  createdAt / updatedAt / createdBy
```

## prescriptions
```
prescriptions/{id}
  patientId        string
  doctorId          string
  medicalRecordId  string | null
  items            array<{ medicineId: string, medicineName: string, dosage: string, frequency: string, durationDays: number }>
  purchaseSource   string | null  // "in_house" | "external" | null (not yet purchased)
  purchasedAt      Timestamp | null
  createdAt / updatedAt / createdBy
```

## pharmacy_sales
One document per completed pharmacy transaction (in-house only; external
purchases are inferred from `prescriptions.purchaseSource === "external"`
with no matching pharmacy_sales doc).
```
pharmacy_sales/{id}
  prescriptionId   string | null
  patientId        string | null
  items            array<{ medicineId: string, name: string, quantity: number, unitPrice: number }>
  totalAmount      number
  paymentMethod    string   // "cash" | "card" | "insurance" | "upi"
  soldBy           string   // ref: users/{uid} (pharmacist)
  createdAt / updatedAt / createdBy
```

## medicines
```
medicines/{id}
  name             string
  category         string
  batchNumber      string
  manufactureDate  Timestamp
  expiryDate       Timestamp
  stockQuantity    number
  reorderLevel     number
  unitPrice        number
  supplierId       string   // ref: suppliers/{id}
  barcodeValue     string
  createdAt / updatedAt / createdBy
```

## stock
Inventory movement ledger — one doc per stock change, so `medicines.stockQuantity`
is always reconstructable/auditable from history.
```
stock/{id}
  medicineId       string   // ref: medicines/{id}
  changeType       string   // "restock" | "sale" | "adjustment" | "expired_writeoff"
  quantityDelta    number   // positive for restock, negative for sale/writeoff
  resultingStock   number
  reference        string | null  // e.g. pharmacy_sales/{id} or supplier PO number
  note             string | null
  createdAt / createdBy
```

## lab_tests
```
lab_tests/{id}
  patientId        string
  testName         string
  requestedBy       string   // ref: doctors/{id} or users/{uid}
  status           string   // "Requested" | "Sample collected" | "In progress" | "Report ready"
  reportUrl        string | null   // Firebase Storage download URL
  reportStoragePath string | null
  requestedAt      Timestamp
  completedAt      Timestamp | null
  createdAt / updatedAt / createdBy
```

## vaccinations
```
vaccinations/{id}
  patientId        string
  vaccineName      string
  doseNumber       number
  administeredAt   Timestamp
  administeredBy   string   // ref: users/{uid}
  nextDoseDueAt    Timestamp | null
  createdAt / createdBy
```

## documents
Generic uploaded-document registry (separate from medical_records.attachments
so receptionist/admin-uploaded documents like ID proofs aren't mixed with
clinical attachments).
```
documents/{id}
  patientId        string | null
  employeeId       string | null
  category         string   // "id_proof" | "insurance_card" | "consent_form" | "discharge_summary" | ...
  fileName         string
  url              string
  storagePath      string
  uploadedBy       string   // ref: users/{uid}
  createdAt
```

## insurance
```
insurance/{id}
  patientId        string
  provider         string
  policyNumber     string
  coverageAmount   number
  validFrom        Timestamp
  validTo          Timestamp
  status           string   // "active" | "expiring_soon" | "expired"
  createdAt / updatedAt / createdBy
```

## billing
```
billing/{id}
  patientId        string
  patientName      string   // denormalized
  items            array<{ description: string, amount: number }>
  totalAmount      number
  amountPaid       number
  status           string   // "Paid" | "Pending" | "Overdue" | "Insurance review"
  insuranceId      string | null   // ref: insurance/{id}
  paymentMethod    string | null
  invoiceNumber    string   // human-readable, e.g. INV-2026-00231
  pdfStoragePath   string | null
  createdAt / updatedAt / createdBy
```

## admissions
```
admissions/{id}
  patientId        string
  roomId           string    // ref: rooms/{id}
  admittedAt       Timestamp
  dischargedAt     Timestamp | null
  attendingDoctorId string   // ref: doctors/{id}
  reason           string
  status           string   // "admitted" | "discharged"
  createdAt / updatedAt / createdBy
```

## rooms
```
rooms/{id}
  roomNumber       string
  type             string   // "ICU" | "General Ward" | "Private" | "Semi-Private"
  floor            string
  status           string   // "available" | "occupied" | "maintenance"
  currentPatientId string | null
  createdAt / updatedAt
```

## ambulance
```
ambulance/{id}
  vehicleNumber    string
  driverName       string
  driverPhone      string
  status           string   // "available" | "dispatched" | "returning" | "maintenance"
  currentCaseId    string | null  // ref: emergency_cases/{id}
  createdAt / updatedAt
```

## suppliers
```
suppliers/{id}
  name             string
  contactPerson    string
  phone            string
  email            string
  address          string
  medicinesSupplied array<string>  // ref list: medicines/{id}
  createdAt / updatedAt / createdBy
```

## attendance
```
attendance/{id}
  employeeId       string   // ref: employees/{id}
  date             Timestamp   // truncated to day
  checkInAt        Timestamp | null
  checkOutAt       Timestamp | null
  status           string   // "present" | "absent" | "half_day" | "leave"
  createdAt / updatedAt
```

## salary
```
salary/{id}
  employeeId       string   // ref: employees/{id}
  month            string   // "2026-06"
  baseSalary       number
  deductions       number
  bonuses          number
  netPay           number
  paidAt           Timestamp | null
  status           string   // "pending" | "paid"
  createdAt / updatedAt / createdBy
```

## feedback
```
feedback/{id}
  patientId        string | null
  patientName      string   // denormalized, allows anonymous display name
  doctorId         string   // ref: doctors/{id}
  rating           number   // 1-5
  comment          string
  createdAt
```

## notifications
```
notifications/{id}
  targetRole       string | null   // broadcast to a role, e.g. "pharmacist"
  targetUserId     string | null   // or a specific user
  type             string   // "low_stock" | "expiry" | "appointment_reminder" | "insurance_expiry" | "follow_up" | "emergency"
  severity         string   // "info" | "warning" | "critical"
  message          string
  relatedRef       string | null   // path to related doc, e.g. "medicines/abc123"
  read             boolean
  createdAt
```

## audit_logs
Write-only collection (no updates/deletes — see firestore.rules). Every
critical write across the app should append one of these.
```
audit_logs/{id}
  userId           string   // ref: users/{uid}
  userName         string   // denormalized
  action           string   // "login" | "logout" | "patient_record_update" | "stock_update" | "billing_change" | "prescription_update" | ...
  targetCollection string | null
  targetDocId      string | null
  metadata         map | null
  ipAddress        string | null
  createdAt
```

## emergency_cases
```
emergency_cases/{id}
  patientId        string | null   // null if patient not yet registered (e.g. unconscious arrival)
  patientName      string
  priority         string   // "Critical" | "High" | "Moderate"
  status           string   // "Incoming" | "In ER" | "Stabilized" | "Admitted"
  ambulanceId      string | null   // ref: ambulance/{id}
  etaMinutes       number | null
  assignedDoctorId string | null
  createdAt / updatedAt / createdBy
```
