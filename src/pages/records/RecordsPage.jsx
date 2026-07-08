// src/pages/records/RecordsPage.jsx

import React, { useState, useEffect } from "react";
import { FileText, Upload, Download, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  GlassCard, SectionHeader, SearchInput, Badge, PrimaryBtn, GhostBtn, Skeleton,
} from "../../components/ui/index";

async function getPatientList() {
  const snap = await getDocs(query(collection(db, "patients"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getRecordsForPatient(patientId) {
  const snap = await getDocs(
    query(
      collection(db, "medical_records"),
      where("patientId", "==", patientId),
      orderBy("visitDate", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function RecordsPage() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [patientLoading, setPatientLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");

  useEffect(() => {
    getPatientList()
      .then(setPatients)
      .catch(() => toast.error("Failed to load patients"))
      .finally(() => setPatientLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPatient) return;
    setRecordsLoading(true);
    getRecordsForPatient(selectedPatient.id)
      .then(setRecords)
      .catch(() => toast.error("Failed to load records"))
      .finally(() => setRecordsLoading(false));
  }, [selectedPatient]);

  const filteredPatients = patients.filter((p) =>
    p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.id?.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Demo timeline entries when no Firestore records exist yet
  const demoRecords = [
    {
      id: "demo1",
      visitDate: { toDate: () => new Date("2026-06-12") },
      diagnosis: "Hypertension — controlled",
      treatmentPlan: "Continue Amlodipine 5mg, reduce sodium intake, monthly BP monitoring.",
      notes: "Patient reports occasional headaches. BP 138/88 at visit.",
      doctorName: "Dr. Sharma",
      attachments: [],
    },
    {
      id: "demo2",
      visitDate: { toDate: () => new Date("2026-05-28") },
      diagnosis: "Lipid profile — borderline elevated",
      treatmentPlan: "Dietary advice given. Start Atorvastatin 10mg if no improvement in 3 months.",
      notes: "LDL 142 mg/dL. Patient counselled on lifestyle changes.",
      doctorName: "Dr. Mehta",
      attachments: [{ name: "lipid_report.pdf", url: "#" }],
    },
    {
      id: "demo3",
      visitDate: { toDate: () => new Date("2026-04-14") },
      diagnosis: "Prescription renewal",
      treatmentPlan: "Renewed Metformin 500mg, continue current dosage.",
      notes: "HbA1c 6.8% — within target range.",
      doctorName: "Dr. Sharma",
      attachments: [],
    },
  ];

  const displayRecords = records.length > 0 ? records : (selectedPatient ? demoRecords : []);

  return (
    <div className="space-y-4">
      <SectionHeader title="Medical records" subtitle="Consultation history, diagnoses & treatment timelines">
        {selectedPatient && (
          <GhostBtn icon={Upload} onClick={() => toast("Open file upload dialog")}>
            Upload report
          </GhostBtn>
        )}
        {selectedPatient && (
          <PrimaryBtn icon={FileText} onClick={() => toast("Open new record form")}>
            New record
          </PrimaryBtn>
        )}
      </SectionHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient selector panel */}
        <GlassCard noPad className="lg:col-span-1 flex flex-col" style={{ maxHeight: "600px" }}>
          <div className="p-3 border-b border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <SearchInput value={patientSearch} onChange={setPatientSearch} placeholder="Search patients…" />
          </div>
          <div className="overflow-y-auto thin-scrollbar flex-1">
            {patientLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : filteredPatients.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No patients found</p>
            ) : (
              filteredPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPatient(p); setRecords([]); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                    selectedPatient?.id === p.id
                      ? "bg-sky-50 dark:bg-sky-900/20"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {p.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.id} · {p.bloodGroup}</p>
                  </div>
                  {selectedPatient?.id === p.id && (
                    <ChevronRight size={15} className="text-sky-500 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </GlassCard>

        {/* Records panel */}
        <GlassCard className="lg:col-span-2">
          {!selectedPatient ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-2xl bg-sky-500/10 text-sky-500 mb-3">
                <FileText size={28} />
              </div>
              <p className="font-medium text-slate-600 dark:text-slate-300">Select a patient</p>
              <p className="text-sm text-slate-400 mt-1">Choose a patient from the list to view their medical records.</p>
            </div>
          ) : (
            <>
              {/* Patient header */}
              <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="font-semibold text-lg text-slate-800 dark:text-slate-100">{selectedPatient.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs text-slate-400">{selectedPatient.id}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-400">{selectedPatient.age}y · {selectedPatient.gender}</span>
                    {selectedPatient.bloodGroup && <Badge tone="red">{selectedPatient.bloodGroup}</Badge>}
                    {selectedPatient.allergies?.map((a) => (
                      <Badge key={a} tone="amber">⚠️ {a}</Badge>
                    ))}
                    {selectedPatient.chronicConditions?.map((c) => (
                      <Badge key={c} tone="indigo">{c}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {recordsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : displayRecords.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No records found for this patient.</p>
              ) : (
                <div className="space-y-0">
                  {displayRecords.map((r, idx) => (
                    <div key={r.id} className="flex gap-4">
                      {/* Timeline spine */}
                      <div className="flex flex-col items-center pt-1 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-sky-500 ring-4 ring-sky-100 dark:ring-sky-900/40 shrink-0" />
                        {idx < displayRecords.length - 1 && (
                          <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-1 mb-0" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <p className="text-xs font-medium text-slate-400 mb-0.5">
                          {r.visitDate?.toDate?.()?.toLocaleDateString("en-IN", {
                            day: "2-digit", month: "long", year: "numeric",
                          })}
                        </p>
                        <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            {r.diagnosis}
                          </p>
                          <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                            <span className="font-medium">Treatment:</span> {r.treatmentPlan}
                          </p>
                          {r.notes && (
                            <p className="text-xs text-slate-400 mb-2 leading-relaxed">{r.notes}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-slate-400">
                              {r.doctorName || r.doctorId}
                            </p>
                            {r.attachments?.length > 0 && (
                              <div className="flex gap-1">
                                {r.attachments.map((att) => (
                                  <a
                                    key={att.name}
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-xs text-sky-600 hover:underline"
                                  >
                                    <Download size={11} /> {att.name}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
