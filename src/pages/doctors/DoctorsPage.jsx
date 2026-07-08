// src/pages/doctors/DoctorsPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { Stethoscope, Plus, Star, Calendar, TrendingUp, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  GlassCard, SectionHeader, SearchInput, Badge, PrimaryBtn, GhostBtn, Skeleton,
} from "../../components/ui/index";

async function getDoctors() {
  const snap = await getDocs(query(collection(db, "doctors"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const SPECIALTIES_FILTER = ["All", "Cardiology", "Orthopedics", "Pediatrics", "Dermatology", "Neurology", "General Medicine", "Gynecology", "ENT"];

export function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getDoctors()
      .then(setDoctors)
      .catch(() => toast.error("Failed to load doctors"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let rows = doctors;
    if (specFilter !== "All") rows = rows.filter((d) => d.specialization === specFilter);
    if (search.trim()) {
      const t = search.toLowerCase();
      rows = rows.filter((d) => d.name?.toLowerCase().includes(t) || d.specialization?.toLowerCase().includes(t));
    }
    return rows;
  }, [doctors, search, specFilter]);

  const available = doctors.filter((d) => d.active).length;

  return (
    <div className="space-y-4">
      <SectionHeader title="Doctor management" subtitle={`${doctors.length} doctors · ${available} active`}>
        <PrimaryBtn icon={Plus} onClick={() => toast("Open add-doctor form")}>Add doctor</PrimaryBtn>
      </SectionHeader>

      {/* Specialty filter chips */}
      <div className="flex gap-2 flex-wrap">
        {SPECIALTIES_FILTER.map((s) => (
          <button
            key={s}
            onClick={() => setSpecFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              specFilter === s
                ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white border-transparent shadow-md"
                : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="w-72">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or specialization…" />
      </div>

      {/* Doctor grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No doctors match your filter.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <GlassCard key={d.id} className="flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white text-lg font-bold shrink-0">
                    {d.name?.split(" ").at(-1)?.[0] || "D"}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm leading-tight">{d.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{d.specialization}</p>
                    <p className="text-xs text-slate-400">{d.qualifications}</p>
                  </div>
                </div>
                <Badge tone={d.active ? "green" : "gray"}>{d.active ? "Active" : "Off duty"}</Badge>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between text-xs text-slate-500 py-3 border-y border-slate-100 dark:border-slate-800 mb-3">
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  {d.rating ?? "—"}
                </span>
                <span>₹{d.consultationFee}/visit</span>
                <span>{d.department}</span>
              </div>

              {/* Availability preview */}
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Availability</p>
                <div className="flex flex-wrap gap-1">
                  {d.availability?.slice(0, 3).map((av) => (
                    <span key={av.day} className="text-[10px] px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400">
                      {av.day.slice(0, 3)} {av.slots?.[0]?.start}–{av.slots?.[0]?.end}
                    </span>
                  ))}
                  {!d.availability?.length && <span className="text-xs text-slate-400">No schedule set</span>}
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <GhostBtn className="flex-1 justify-center" icon={Calendar} onClick={() => toast(`Opening ${d.name}'s schedule`)}>
                  Schedule
                </GhostBtn>
                <GhostBtn className="flex-1 justify-center" icon={TrendingUp} onClick={() => setSelected(d)}>
                  Metrics
                </GhostBtn>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Doctor metrics modal */}
      {selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{selected.name} — Performance</h3>
              <button onClick={() => setSelected(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Patient rating", value: `${selected.rating ?? "—"} / 5.0` },
                { label: "Consultations this month", value: "48" },
                { label: "Avg consultation time", value: "22 min" },
                { label: "Appointments completed", value: "94%" },
                { label: "Cancellation rate", value: "3.2%" },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-sm text-slate-500">{m.label}</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{m.value}</span>
                </div>
              ))}
            </div>
            <GhostBtn className="mt-4 w-full justify-center" onClick={() => setSelected(null)}>Close</GhostBtn>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
