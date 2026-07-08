// src/pages/admissions/AdmissionsPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { BedDouble, Plus, X, Building2, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import {
  GlassCard, SectionHeader, SearchInput, StatusBadge, Badge,
  KPICard, PrimaryBtn, GhostBtn, ConfirmDialog, Skeleton,
} from "../../components/ui/index";
import { DataTable } from "../../components/DataTable";

async function getRooms() {
  const snap = await getDocs(collection(db, "rooms"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getAdmissions() {
  const snap = await getDocs(
    query(collection(db, "admissions"), where("status", "==", "admitted"), orderBy("admittedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const ROOM_TYPE_COLORS = {
  ICU: "red", "General Ward": "blue", Private: "teal", "Semi-Private": "indigo",
};

export function AdmissionsPage() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dischargeTarget, setDischargeTarget] = useState(null);
  const [showAdmitForm, setShowAdmitForm] = useState(false);
  const [newAdmission, setNewAdmission] = useState({ patientId: "", patientName: "", reason: "", roomType: "General Ward" });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "admissions"

  useEffect(() => {
    Promise.all([getRooms(), getAdmissions()])
      .then(([r, a]) => { setRooms(r); setAdmissions(a); })
      .catch(() => toast.error("Failed to load admissions data"))
      .finally(() => setLoading(false));
  }, []);

  // Aggregate room stats by type
  const roomStats = useMemo(() => {
    const types = ["ICU", "General Ward", "Private", "Semi-Private"];
    return types.map((type) => {
      const typeRooms = rooms.filter((r) => r.type === type);
      const occupied = typeRooms.filter((r) => r.status === "occupied").length;
      const available = typeRooms.filter((r) => r.status === "available").length;
      const maintenance = typeRooms.filter((r) => r.status === "maintenance").length;
      return { type, total: typeRooms.length, occupied, available, maintenance };
    });
  }, [rooms]);

  const totalBeds = rooms.length;
  const availableBeds = rooms.filter((r) => r.status === "available").length;
  const occupiedBeds = rooms.filter((r) => r.status === "occupied").length;

  const filteredAdmissions = useMemo(() => {
    if (!search.trim()) return admissions;
    const t = search.toLowerCase();
    return admissions.filter(
      (a) => a.patientName?.toLowerCase().includes(t) || a.patientId?.toLowerCase().includes(t)
    );
  }, [admissions, search]);

  const handleDischarge = async () => {
    if (!dischargeTarget) return;
    try {
      await updateDoc(doc(db, "admissions", dischargeTarget.id), {
        status: "discharged",
        dischargedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Free up the room
      if (dischargeTarget.roomId) {
        await updateDoc(doc(db, "rooms", dischargeTarget.roomId), {
          status: "available",
          currentPatientId: null,
          updatedAt: serverTimestamp(),
        });
      }
      setAdmissions((prev) => prev.filter((a) => a.id !== dischargeTarget.id));
      toast.success(`${dischargeTarget.patientName} discharged successfully`);
    } catch {
      toast.error("Failed to process discharge");
    } finally {
      setDischargeTarget(null);
    }
  };

  const handleAdmit = async () => {
    if (!newAdmission.patientId.trim() || !newAdmission.reason.trim()) {
      toast.error("Patient ID and reason are required");
      return;
    }
    setSubmitting(true);
    try {
      // Find an available room of the requested type
      const availableRoom = rooms.find(
        (r) => r.type === newAdmission.roomType && r.status === "available"
      );
      if (!availableRoom) {
        toast.error(`No available ${newAdmission.roomType} beds`);
        setSubmitting(false);
        return;
      }

      const admRef = await addDoc(collection(db, "admissions"), {
        patientId: newAdmission.patientId.trim().toUpperCase(),
        patientName: newAdmission.patientName.trim() || newAdmission.patientId,
        roomId: availableRoom.id,
        roomNumber: availableRoom.roomNumber,
        roomType: availableRoom.type,
        admittedAt: serverTimestamp(),
        dischargedAt: null,
        attendingDoctorId: null,
        reason: newAdmission.reason.trim(),
        status: "admitted",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: profile?.uid || "unknown",
      });

      // Mark room as occupied
      await updateDoc(doc(db, "rooms", availableRoom.id), {
        status: "occupied",
        currentPatientId: newAdmission.patientId.trim().toUpperCase(),
        updatedAt: serverTimestamp(),
      });

      const newEntry = {
        id: admRef.id,
        patientId: newAdmission.patientId.trim().toUpperCase(),
        patientName: newAdmission.patientName.trim() || newAdmission.patientId,
        roomId: availableRoom.id,
        roomNumber: availableRoom.roomNumber,
        roomType: availableRoom.type,
        reason: newAdmission.reason.trim(),
        status: "admitted",
        admittedAt: { toDate: () => new Date() },
      };

      setAdmissions((prev) => [newEntry, ...prev]);
      setRooms((prev) =>
        prev.map((r) => r.id === availableRoom.id ? { ...r, status: "occupied" } : r)
      );
      setShowAdmitForm(false);
      setNewAdmission({ patientId: "", patientName: "", reason: "", roomType: "General Ward" });
      toast.success(`Admitted to ${availableRoom.roomNumber}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to admit patient");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Admissions & room management" subtitle="Bed allocation, occupancy and discharge workflow">
        <PrimaryBtn icon={Plus} onClick={() => setShowAdmitForm(true)}>New admission</PrimaryBtn>
      </SectionHeader>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard icon={BedDouble} label="Total beds" value={totalBeds} tone="blue" loading={loading} />
        <KPICard icon={BedDouble} label="Available now" value={availableBeds} tone="green" loading={loading} />
        <KPICard icon={BedDouble} label="Occupied" value={occupiedBeds} tone="red" deltaTone="red" loading={loading} />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 w-fit">
        {["overview", "admissions"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab === "overview" ? "Room overview" : "Current admissions"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)
            : roomStats.map((rs) => (
                <GlassCard key={rs.type}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{rs.type}</p>
                    <Building2 size={16} className="text-slate-400" />
                  </div>
                  <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                    {rs.available}
                    <span className="text-base font-normal text-slate-400"> / {rs.total}</span>
                  </p>
                  <p className="text-xs text-slate-400 mb-3">beds available</p>

                  {/* Occupancy bar */}
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all"
                      style={{ width: rs.total ? `${(rs.occupied / rs.total) * 100}%` : "0%" }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Occupied: {rs.occupied}</span>
                    {rs.maintenance > 0 && <span className="text-amber-500">Maint: {rs.maintenance}</span>}
                    <span>{rs.total ? Math.round((rs.occupied / rs.total) * 100) : 0}%</span>
                  </div>
                </GlassCard>
              ))}
        </div>
      )}

      {activeTab === "admissions" && (
        <GlassCard noPad>
          <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="w-72">
              <SearchInput value={search} onChange={setSearch} placeholder="Search by patient name or ID…" />
            </div>
          </div>
          <DataTable
            columns={["Patient", "Room", "Room type", "Admitted on", "Reason", ""]}
            rows={filteredAdmissions}
            loading={loading}
            emptyIcon={BedDouble}
            emptyTitle="No current admissions"
            emptySubtitle="All patients have been discharged, or use 'New admission' to admit one."
            renderRow={(a) => (
              <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {a.patientName?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{a.patientName}</p>
                      <p className="text-xs text-slate-400">{a.patientId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone="teal">{a.roomNumber || "—"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={ROOM_TYPE_COLORS[a.roomType] || "gray"}>{a.roomType}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {a.admittedAt?.toDate?.()?.toLocaleDateString("en-IN") || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate" title={a.reason}>
                  {a.reason || "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDischargeTarget(a)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:hover:bg-rose-900/20 transition-colors"
                  >
                    <LogOut size={13} /> Discharge
                  </button>
                </td>
              </tr>
            )}
          />
        </GlassCard>
      )}

      {/* Discharge confirm dialog */}
      <ConfirmDialog
        open={!!dischargeTarget}
        title="Discharge patient?"
        body={`Discharge ${dischargeTarget?.patientName} from room ${dischargeTarget?.roomNumber}? The bed will be marked available immediately.`}
        confirmLabel="Discharge"
        destructive
        onCancel={() => setDischargeTarget(null)}
        onConfirm={handleDischarge}
      />

      {/* New admission modal */}
      {showAdmitForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">New admission</h3>
              <button onClick={() => setShowAdmitForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Patient ID", key: "patientId", placeholder: "PT-10234" },
                { label: "Patient name", key: "patientName", placeholder: "Full name" },
                { label: "Reason for admission", key: "reason", placeholder: "e.g. Post-operative care" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
                  <input
                    value={newAdmission[key]}
                    onChange={(e) => setNewAdmission((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Room type</label>
                <select
                  value={newAdmission.roomType}
                  onChange={(e) => setNewAdmission((p) => ({ ...p, roomType: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400"
                >
                  {["ICU", "General Ward", "Private", "Semi-Private"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                {roomStats.find((r) => r.type === newAdmission.roomType)?.available === 0 && (
                  <p className="text-xs text-rose-500 mt-1">
                    ⚠ No {newAdmission.roomType} beds available
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <GhostBtn className="flex-1 justify-center" onClick={() => setShowAdmitForm(false)}>Cancel</GhostBtn>
              <PrimaryBtn className="flex-1 justify-center" onClick={handleAdmit} disabled={submitting}>
                {submitting ? "Admitting…" : "Confirm admission"}
              </PrimaryBtn>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
