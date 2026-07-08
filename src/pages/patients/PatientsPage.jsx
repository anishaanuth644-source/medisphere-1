// src/pages/patients/PatientsPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { QrCode, UserRound, Plus, Filter, Download, Eye, Edit2, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { getAllPatients, deactivatePatient } from "../../services/patientService";
import { useAuth } from "../../context/AuthContext";
import { downloadCSV, patientsToExportRows } from "../../utils/exportUtils";
import {
  GlassCard, SectionHeader, SearchInput, Badge, StatusBadge,
  PrimaryBtn, GhostBtn, ConfirmDialog, Skeleton,
} from "../../components/ui/index";
import { DataTable } from "../../components/DataTable";

export function PatientsPage() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [qrPatient, setQrPatient] = useState(null);

  useEffect(() => {
    getAllPatients()
      .then(setPatients)
      .catch(() => toast.error("Failed to load patients"))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    if (!search.trim()) return patients;
    const term = search.toLowerCase();
    return patients.filter(
      (p) =>
        p.name?.toLowerCase().includes(term) ||
        p.id?.toLowerCase().includes(term) ||
        p.phone?.includes(term)
    );
  }, [patients, search]);

  const handleDeactivate = async () => {
    if (!confirmId) return;
    try {
      await deactivatePatient(confirmId, profile);
      setPatients((prev) => prev.filter((p) => p.id !== confirmId));
      toast.success("Patient record deactivated");
    } catch (err) {
      toast.error("Failed to deactivate patient");
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Patient management" subtitle={`${patients.length} registered patients`}>
        <GhostBtn icon={Filter}>Filters</GhostBtn>
        <GhostBtn icon={Download} onClick={() => downloadCSV(patientsToExportRows(rows), "patients.csv")}>
          Export CSV
        </GhostBtn>
        <PrimaryBtn icon={Plus} onClick={() => toast("Open patient registration form — implement with a modal or /patients/new route")}>
          Register patient
        </PrimaryBtn>
      </SectionHeader>

      {/* QR modal */}
      {qrPatient && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-xs text-center">
            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{qrPatient.name}</p>
            <p className="text-xs text-slate-400 mb-4">{qrPatient.id}</p>
            <QRCodeSVG value={qrPatient.id} size={180} className="mx-auto" />
            <p className="text-[10px] text-slate-400 mt-3">Scan to pull up patient record at any terminal</p>
            <GhostBtn className="mt-4 w-full justify-center" onClick={() => setQrPatient(null)}>Close</GhostBtn>
          </GlassCard>
        </div>
      )}

      <GlassCard noPad>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-3 items-center justify-between">
          <div className="w-72">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, patient ID, or phone…" />
          </div>
          <Badge tone="blue">
            <QrCode size={11} className="inline mr-1" /> QR identification enabled
          </Badge>
        </div>

        <DataTable
          columns={["Patient", "Age / Gender", "Blood group", "Conditions", "Last visit", "Status", ""]}
          rows={rows}
          loading={loading}
          emptyIcon={UserRound}
          emptyTitle="No patients found"
          emptySubtitle="Try a different search term, or register a new patient."
          exportRows={() => patientsToExportRows(rows)}
          exportFilename="patients.csv"
          renderRow={(p) => (
            <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {p.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{p.age} · {p.gender}</td>
              <td className="px-4 py-3"><Badge tone="red">{p.bloodGroup}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {p.allergies?.map((a) => <Badge key={a} tone="amber">{a}</Badge>)}
                  {p.chronicConditions?.map((c) => <Badge key={c} tone="indigo">{c}</Badge>)}
                  {!p.allergies?.length && !p.chronicConditions?.length && (
                    <span className="text-xs text-slate-400">None recorded</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {p.registeredAt?.toDate?.()?.toLocaleDateString("en-IN") || "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={p.active === false ? "Deactivated" : "Active"} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => setQrPatient(p)}
                    title="Show QR code"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <QrCode size={15} />
                  </button>
                  <button
                    title="View record"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                    onClick={() => toast("Navigate to /patients/:id — implement patient detail page")}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    title="Edit"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                    onClick={() => toast("Open patient edit form")}
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    title="Deactivate"
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-400"
                    onClick={() => setConfirmId(p.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
      </GlassCard>

      <ConfirmDialog
        open={!!confirmId}
        title="Deactivate patient record?"
        body="This will mark the record as inactive and is logged in the audit trail. A Super Admin can reactivate it."
        destructive
        confirmLabel="Deactivate"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
