// src/pages/emergency/EmergencyPage.jsx

import React, { useState, useEffect } from "react";
import { Siren, Plus, RefreshCw, Ambulance, X, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
  collection, addDoc, updateDoc, doc,
  query, orderBy, serverTimestamp, onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import {
  GlassCard, SectionHeader, StatusBadge, Badge,
  KPICard, PrimaryBtn, GhostBtn,
} from "../../components/ui/index";

const PRIORITIES = ["Critical", "High", "Moderate"];
const STATUSES = ["Incoming", "In ER", "Stabilized", "Admitted"];

const PRIORITY_STYLES = {
  Critical: {
    card: "ring-2 ring-rose-400/50 bg-rose-50/30 dark:bg-rose-900/10",
    icon: "bg-rose-500/15 text-rose-500",
    pulse: true,
  },
  High: {
    card: "ring-1 ring-amber-300/50 bg-amber-50/20 dark:bg-amber-900/10",
    icon: "bg-amber-500/15 text-amber-500",
    pulse: false,
  },
  Moderate: {
    card: "",
    icon: "bg-sky-500/15 text-sky-500",
    pulse: false,
  },
};

export function EmergencyPage() {
  const { profile } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCase, setNewCase] = useState({
    patientName: "", priority: "High", etaMinutes: "", ambulance: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // Real-time listener for emergency cases
  useEffect(() => {
    const q = query(collection(db, "emergency_cases"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCases(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        toast.error("Failed to load emergency cases");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const activeCases = cases.filter((c) => !["Stabilized", "Admitted"].includes(c.status));
  const criticalCount = cases.filter((c) => c.priority === "Critical").length;

  const handleAdvanceStatus = async (ecase) => {
    const idx = STATUSES.indexOf(ecase.status);
    if (idx >= STATUSES.length - 1) return;
    const nextStatus = STATUSES[idx + 1];
    try {
      await updateDoc(doc(db, "emergency_cases", ecase.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Status → ${nextStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleCreateCase = async () => {
    if (!newCase.patientName.trim()) { toast.error("Patient name is required"); return; }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "emergency_cases"), {
        patientId: null,
        patientName: newCase.patientName.trim(),
        priority: newCase.priority,
        status: "Incoming",
        ambulanceId: null,
        etaMinutes: newCase.etaMinutes ? parseInt(newCase.etaMinutes) : null,
        assignedDoctorId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: profile?.uid || "unknown",
      });
      setShowForm(false);
      setNewCase({ patientName: "", priority: "High", etaMinutes: "", ambulance: false });
      toast.success("Emergency case logged");
    } catch {
      toast.error("Failed to log case");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Emergency management" subtitle="Live case queue — real-time updates">
        <div className="flex items-center gap-2">
          {activeCases.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {activeCases.length} active
            </span>
          )}
          <PrimaryBtn icon={Siren} onClick={() => setShowForm(true)}>Log emergency</PrimaryBtn>
        </div>
      </SectionHeader>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard icon={Siren} label="Total cases today" value={cases.length} tone="red" loading={loading} />
        <KPICard icon={AlertTriangle} label="Critical priority" value={criticalCount} tone="red" deltaTone="red" loading={loading} />
        <KPICard icon={Ambulance} label="Active / incoming" value={activeCases.length} tone="amber" loading={loading} />
      </div>

      {/* Cases list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200/50 dark:bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <GlassCard className="text-center py-16">
          <div className="text-4xl mb-3">🏥</div>
          <p className="font-medium text-slate-600 dark:text-slate-300">No emergency cases</p>
          <p className="text-sm text-slate-400 mt-1">All clear — log a new case when needed.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => {
            const style = PRIORITY_STYLES[c.priority] || PRIORITY_STYLES.Moderate;
            const isResolved = ["Stabilized", "Admitted"].includes(c.status);
            return (
              <GlassCard
                key={c.id}
                className={`flex flex-wrap items-center justify-between gap-4 transition-all ${style.card} ${isResolved ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${style.icon} ${style.pulse ? "animate-pulse" : ""}`}>
                    <Siren size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{c.patientName}</p>
                      <StatusBadge status={c.priority} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {c.ambulanceId && (
                        <span className="flex items-center gap-1">
                          <Ambulance size={12} /> {c.ambulanceId}
                        </span>
                      )}
                      {c.etaMinutes && (
                        <span>ETA {c.etaMinutes} min</span>
                      )}
                      <span>
                        {c.createdAt?.toDate?.()?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) || ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={c.status} />
                  {!isResolved && (
                    <button
                      onClick={() => handleAdvanceStatus(c)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <RefreshCw size={12} />
                      {STATUSES[STATUSES.indexOf(c.status) + 1] || "Done"}
                    </button>
                  )}
                  {!isResolved && (
                    <GhostBtn onClick={() => toast("Ambulance dispatch modal — wire to ambulance collection")}>
                      <Ambulance size={14} className="mr-1" /> Dispatch
                    </GhostBtn>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Log emergency modal */}
      {showForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Log emergency case</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Patient name / description</label>
                <input
                  value={newCase.patientName}
                  onChange={(e) => setNewCase((p) => ({ ...p, patientName: e.target.value }))}
                  placeholder="Name or 'Unknown male, ~40y'"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Priority</label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewCase((prev) => ({ ...prev, priority: p }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        newCase.priority === p
                          ? p === "Critical" ? "bg-rose-500 text-white border-rose-500"
                            : p === "High" ? "bg-amber-500 text-white border-amber-500"
                            : "bg-sky-500 text-white border-sky-500"
                          : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">ETA (minutes, if via ambulance)</label>
                <input
                  type="number"
                  value={newCase.etaMinutes}
                  onChange={(e) => setNewCase((p) => ({ ...p, etaMinutes: e.target.value }))}
                  placeholder="e.g. 8"
                  min="1"
                  max="120"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <GhostBtn className="flex-1 justify-center" onClick={() => setShowForm(false)}>Cancel</GhostBtn>
              <button
                onClick={handleCreateCase}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {submitting ? "Logging…" : "Log emergency"}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
