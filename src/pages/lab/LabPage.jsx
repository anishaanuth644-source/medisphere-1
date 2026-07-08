// src/pages/lab/LabPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { FlaskConical, Plus, Download, Upload, RefreshCw, X } from "lucide-react";
import toast from "react-hot-toast";
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import {
  GlassCard, SectionHeader, SearchInput, StatusBadge, Badge,
  KPICard, PrimaryBtn, GhostBtn, Skeleton,
} from "../../components/ui/index";
import { DataTable } from "../../components/DataTable";

const LAB_TESTS = [
  "Complete Blood Count", "Lipid Profile", "Liver Function Test",
  "Thyroid Panel (T3/T4/TSH)", "Blood Glucose (Fasting)", "HbA1c",
  "Urine Routine & Microscopy", "X-Ray Chest PA", "ECG 12-lead",
  "Kidney Function Test", "Serum Electrolytes", "COVID-19 Antigen",
];

const STATUS_ORDER = ["Requested", "Sample collected", "In progress", "Report ready"];

async function getLabTests() {
  const snap = await getDocs(query(collection(db, "lab_tests"), orderBy("requestedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function LabPage() {
  const { profile } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [newTest, setNewTest] = useState({ patientId: "", testName: LAB_TESTS[0] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getLabTests()
      .then(setTests)
      .catch(() => toast.error("Failed to load lab tests"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let rows = tests;
    if (statusFilter !== "all") rows = rows.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const term = search.toLowerCase();
      rows = rows.filter(
        (t) => t.patientId?.toLowerCase().includes(term) || t.testName?.toLowerCase().includes(term)
      );
    }
    return rows;
  }, [tests, search, statusFilter]);

  const counts = useMemo(() =>
    Object.fromEntries(STATUS_ORDER.map((s) => [s, tests.filter((t) => t.status === s).length])),
    [tests]
  );

  const handleAdvanceStatus = async (test) => {
    const currentIdx = STATUS_ORDER.indexOf(test.status);
    if (currentIdx >= STATUS_ORDER.length - 1) return;
    const nextStatus = STATUS_ORDER[currentIdx + 1];
    try {
      await updateDoc(doc(db, "lab_tests", test.id), {
        status: nextStatus,
        ...(nextStatus === "Report ready" ? { completedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      });
      setTests((prev) => prev.map((t) => t.id === test.id ? { ...t, status: nextStatus } : t));
      toast.success(`Status → ${nextStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleCreateTest = async () => {
    if (!newTest.patientId.trim()) { toast.error("Enter a patient ID"); return; }
    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db, "lab_tests"), {
        patientId: newTest.patientId.trim().toUpperCase(),
        testName: newTest.testName,
        requestedBy: profile?.uid || "unknown",
        status: "Requested",
        reportUrl: null,
        reportStoragePath: null,
        requestedAt: serverTimestamp(),
        completedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: profile?.uid || "unknown",
      });
      const created = {
        id: ref.id,
        patientId: newTest.patientId.trim().toUpperCase(),
        testName: newTest.testName,
        status: "Requested",
        requestedAt: { toDate: () => new Date() },
      };
      setTests((prev) => [created, ...prev]);
      setShowForm(false);
      setNewTest({ patientId: "", testName: LAB_TESTS[0] });
      toast.success("Lab test requested");
    } catch {
      toast.error("Failed to create test request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Laboratory management" subtitle="Test requests, sample tracking & report delivery">
        <PrimaryBtn icon={Plus} onClick={() => setShowForm(true)}>New test request</PrimaryBtn>
      </SectionHeader>

      {/* Status KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUS_ORDER.map((s) => {
          const tones = {
            "Requested": "gray", "Sample collected": "blue",
            "In progress": "amber", "Report ready": "green",
          };
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={`rounded-xl border p-4 text-left transition-all ${
                statusFilter === s
                  ? "ring-2 ring-sky-400 bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800"
                  : "border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{counts[s] ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">{s}</p>
            </button>
          );
        })}
      </div>

      <GlassCard noPad>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3 flex-wrap">
          <div className="w-72">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by patient ID or test name…" />
          </div>
          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={13} /> Clear filter
            </button>
          )}
        </div>

        <DataTable
          columns={["Lab ID", "Patient ID", "Test", "Requested", "Status", "Actions"]}
          rows={filtered}
          loading={loading}
          emptyIcon={FlaskConical}
          emptyTitle="No lab tests found"
          emptySubtitle="Request a new lab test or change the status filter."
          renderRow={(t) => {
            const isLast = t.status === STATUS_ORDER[STATUS_ORDER.length - 1];
            return (
              <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 text-xs font-mono text-slate-400">{t.id?.slice(0, 8)}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">{t.patientId}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{t.testName}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {t.requestedAt?.toDate?.()?.toLocaleDateString("en-IN") || "—"}
                </td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {!isLast && (
                      <button
                        onClick={() => handleAdvanceStatus(t)}
                        title="Advance status"
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100 transition-colors"
                      >
                        <RefreshCw size={12} /> Advance
                      </button>
                    )}
                    {t.status === "Report ready" && (
                      <>
                        <button
                          onClick={() => toast("Report downloaded")}
                          title="Download report"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => toast("Upload updated report")}
                          title="Re-upload report"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                        >
                          <Upload size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          }}
        />
      </GlassCard>

      {/* New test modal */}
      {showForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">New lab test request</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Patient ID</label>
                <input
                  value={newTest.patientId}
                  onChange={(e) => setNewTest((p) => ({ ...p, patientId: e.target.value }))}
                  placeholder="PT-10234"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Test name</label>
                <select
                  value={newTest.testName}
                  onChange={(e) => setNewTest((p) => ({ ...p, testName: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400"
                >
                  {LAB_TESTS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <GhostBtn className="flex-1 justify-center" onClick={() => setShowForm(false)}>Cancel</GhostBtn>
              <PrimaryBtn className="flex-1 justify-center" onClick={handleCreateTest} disabled={submitting}>
                {submitting ? "Requesting…" : "Request test"}
              </PrimaryBtn>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
