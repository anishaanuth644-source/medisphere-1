# MediSphere – Smart Digital Hospital Ecosystem

Production-ready React + Firebase hospital management system with RBAC for 6 roles across 16 modules and 25+ Firestore collections.

---

## Quick start

### 1. Clone and install

```bash
npm install
```

### 2. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. Enable **Authentication** → Sign-in method → **Email/Password**
3. Enable **Cloud Firestore** → Start in **production mode**
4. Enable **Storage** → Start in **production mode**

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Firebase project's web config values (Project settings → General → Your apps):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Create the Super Admin account

1. Firebase Console → Authentication → Users → **Add user**
2. Use `admin@medisphere.health` / a strong password
3. Copy the **UID** shown in the users table
4. Open `scripts/seedFirestore.js` and replace `DEMO_SUPER_ADMIN_UID` with the real UID

### 5. Deploy Firestore rules, Storage rules, and indexes

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 6. Seed sample data

```bash
# Download a service account key:
# Firebase Console → Project settings → Service accounts → Generate new private key
# Save it as serviceAccountKey.json in the project root (never commit this file!)

node scripts/seedFirestore.js
```

### 7. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), sign in as the Super Admin.

---

## Project structure

```
src/
├── assets/              Static assets (logo, icons)
├── components/
│   ├── ui/index.jsx     All shared primitives (GlassCard, Badge, KPICard, etc.)
│   ├── DataTable.jsx    Reusable paginated table with CSV export
│   └── ProtectedRoute.jsx  Route guard combining Auth + RBAC
├── context/
│   └── AuthContext.jsx  Firebase Auth state + Firestore role lookup
├── firebase/
│   └── config.js        Firebase app initialization (reads from .env.local)
├── hooks/
│   └── useSessionTimeout.js  Auto-logout after 20 min inactivity
├── layouts/
│   └── AppLayout.jsx    Sidebar + topbar shell for authenticated pages
├── pages/
│   ├── auth/            LoginPage
│   ├── dashboard/       DashboardPage (live KPIs from Firestore)
│   ├── patients/        PatientsPage (CRUD + QR code)
│   ├── pharmacy/        PharmacyPage (stock + in-house/external analytics)
│   ├── billing/         BillingPage (invoices + jsPDF receipt download)
│   └── [13 more]/       Each follows the same pattern — implement as needed
├── services/
│   ├── auditService.js     Append-only audit log writer
│   ├── patientService.js   Patient CRUD (Firestore)
│   ├── appointmentService.js
│   ├── pharmacyService.js  Stock ledger + purchase source analytics
│   ├── billingService.js   Invoices + PDF generation
│   └── dashboardService.js KPI aggregation
├── utils/
│   ├── rbac.js          Role → module permission map (client-side gate)
│   ├── idGenerators.js  Human-readable ID generators (PT-XXXXX, etc.)
│   └── exportUtils.js   CSV download helper using PapaParse
└── App.jsx              React Router v6 routes, lazy-loaded pages
```

```
firestore/
├── SCHEMA.md            Full schema for all 25 collections
├── firestore.rules      Server-side RBAC security rules
├── firestore.indexes.json  Composite indexes
└── storage.rules        Firebase Storage access rules

scripts/
└── seedFirestore.js     Admin SDK seed script (runs outside the app)
```

---

## User roles and module access

| Module | Super Admin | Doctor | Nurse | Pharmacist | Receptionist | HR Manager |
|---|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Employees | ✅ | | | | | ✅ |
| Doctors | ✅ | | | | | |
| Patients | ✅ | ✅ | ✅ | | ✅ | |
| Appointments | ✅ | ✅ | ✅ | | ✅ | |
| Medical records | ✅ | ✅ | ✅ | | | |
| Pharmacy & inventory | ✅ | | | ✅ | | |
| Laboratory | ✅ | ✅ | ✅ | | | |
| Billing & insurance | ✅ | | | | ✅ | |
| Admissions & rooms | ✅ | | ✅ | | ✅ | |
| Emergency | ✅ | ✅ | ✅ | | ✅ | |
| Analytics & reports | ✅ | | | | | ✅ |
| Feedback | ✅ | ✅ | | | | |
| Notifications | ✅ | | | ✅ | | |
| Audit logs | ✅ | | | | | |

RBAC is enforced at two layers:
- **Client-side** (`src/utils/rbac.js` + `ProtectedRoute`) — hides unauthorized routes
- **Server-side** (`firestore/firestore.rules`) — rejects unauthorized Firestore reads/writes even if client-side is bypassed

---

## Deploying to production

```bash
# Build
npm run build

# Deploy hosting + rules in one command
firebase deploy
```

For Firebase Hosting, ensure `firebase.json` has the `"rewrites"` rule pointing to `index.html` (already set).

---

## Adding a new page (e.g. Appointments)

1. Create `src/pages/appointments/AppointmentsPage.jsx`
2. Model it on `PatientsPage.jsx` — import from `../../services/appointmentService.js`
3. In `App.jsx`, replace the `<StubPage title="Appointments" />` with `<AppointmentsPage />`
4. Done. Routing, RBAC, and layout are already wired.

---

## Firestore collections

See `firestore/SCHEMA.md` for the complete document shape of all 25 collections:

`users` · `employees` · `doctors` · `patients` · `medical_records` · `appointments` ·
`prescriptions` · `pharmacy_sales` · `medicines` · `stock` · `lab_tests` ·
`vaccinations` · `documents` · `insurance` · `billing` · `admissions` · `rooms` ·
`ambulance` · `suppliers` · `attendance` · `salary` · `feedback` ·
`notifications` · `audit_logs` · `emergency_cases`

---

## Key technical decisions

**Why are some fields denormalized (e.g. `patientName` in `appointments`)?**  
Firestore can't join — including the display name in the appointment document avoids fetching the patient document every time an appointment list renders. Update both when the name changes.

**Why is the stock ledger append-only?**  
Security rules deny `update` and `delete` on `stock/` so the inventory history is tamper-proof. `medicines.stockQuantity` is always reconstructable from the ledger.

**Why no full-text search?**  
Firestore doesn't support it natively. For production, integrate Algolia, Typesense, or Firebase Extensions' Search with Algolia. Current `searchPatients()` does a client-side substring scan on up to 500 records — adequate for a single-hospital deployment.

**Session timeout**  
`useSessionTimeout` listens for mouse/keyboard/touch/scroll events. 20 minutes of inactivity triggers `logout()` + redirects to `/login?reason=timeout`.
