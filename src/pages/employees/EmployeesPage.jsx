// src/pages/employees/EmployeesPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { Users, Plus, Filter, Eye, Edit2, Download, Calendar, DollarSign, X } from "lucide-react";
import toast from "react-hot-toast";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  GlassCard, SectionHeader, SearchInput, StatusBadge, Badge,
  KPICard, PrimaryBtn, GhostBtn, ConfirmDialog, Skeleton,
} from "../../components/ui/index";
import { DataTable } from "../../components/DataTable";
import { downloadCSV } from "../../utils/exportUtils";

async function getEmployees() {
  const snap = await getDocs(query(collection(db, "employees"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const DEPT_COLORS = {
  Cardiology: "blue", Pharmacy: "green", Nursing: "teal",
  Administration: "indigo", HR: "violet", Lab: "amber",
  Emergency: "red", Orthopedics: "cyan",
};

export function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);

  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .catch(() => toast.error("Failed to load employees"))
      .finally(() => setLoading(false));
  }, []);

  const departments = useMemo(() => {
    const depts = [...new Set(employees.map((e) => e.department).filter(Boolean))];
    return ["All", ...depts.sort()];
  }, [employees]);

  const filtered = useMemo(() => {
    let rows = employees;
    if (deptFilter !== "All") rows = rows.filter((e) => e.department === deptFilter);
    if (search.trim()) {
      const t = search.toLowerCase();
      rows = rows.filter(
        (e) => e.name?.toLowerCase().includes(t) || e.designation?.toLowerCase().includes(t)
      );
    }
    return rows;
  }, [employees, search, deptFilter]);

  const activeCount = employees.filter((e) => e.status === "Active").length;
  const onLeave = employees.filter((e) => e.status === "On leave").length;

  const exportRows = () =>
    filtered.map((e) => ({
      Name: e.name,
      Department: e.department,
      Designation: e.designation,
      Shift: e.shift,
      Status: e.status,
      "Date Joined": e.dateJoined?.toDate?.()?.toLocaleDateString("en-IN") || "",
    }));

  return (
    <div className="space-y-5">
      <SectionHeader title="Employee management" subtitle={`${employees.length} staff members across all departments`}>
        <GhostBtn icon={Calendar} onClick={() => setShowShiftModal(true)}>Shift schedule</GhostBtn>
        <GhostBtn icon={Download} onClick={() => downloadCSV(exportRows(), "employees.csv")}>Export CSV</GhostBtn>
        <PrimaryBtn icon={Plus} onClick={() => toast("Open add-employee form")}>Add employee</PrimaryBtn>
      </SectionHeader>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard icon={Users} label="Total employees" value={employees.length} tone="blue" loading={loading} />
        <KPICard icon={Users} label="Active today" value={activeCount} tone="green" loading={loading} />
        <KPICard icon={Users} label="On leave" value={onLeave} deltaTone="red" tone="amber" loading={loading} />
      </div>

      {/* Department filter chips */}
      <div className="flex gap-2 flex-wrap">
        {departments.map((d) => (
          <button
            key={d}
            onClick={() => setDeptFilter(d)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              deptFilter === d
                ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white border-transparent shadow-md"
                : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <GlassCard noPad>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="w-72">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name or designation…" />
          </div>
        </div>

        <DataTable
          columns={["Employee", "Department", "Designation", "Shift", "Date joined", "Status", ""]}
          rows={filtered}
          loading={loading}
          emptyIcon={Users}
          emptyTitle="No employees found"
          emptySubtitle="Adjust the department filter or add a new employee."
          exportRows={exportRows}
          exportFilename="employees.csv"
          renderRow={(e) => (
            <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {e.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{e.name}</p>
                    <p className="text-xs text-slate-400">{e.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={DEPT_COLORS[e.department] || "gray"}>{e.department}</Badge>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{e.designation}</td>
              <td className="px-4 py-3">
                <Badge tone={e.shift === "Morning" ? "blue" : e.shift === "Evening" ? "amber" : "indigo"}>
                  {e.shift}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {e.dateJoined?.toDate?.()?.toLocaleDateString("en-IN") || "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={e.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelected(e)}
                    title="View profile"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => toast("Open payroll details")}
                    title="Payroll"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <DollarSign size={15} />
                  </button>
                  <button
                    onClick={() => toast("Open edit form")}
                    title="Edit"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
      </GlassCard>

      {/* Employee profile modal */}
      {selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Employee profile</h3>
              <button onClick={() => setSelected(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white text-xl font-bold">
                {selected.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{selected.name}</p>
                <p className="text-sm text-slate-400">{selected.designation}</p>
                <p className="text-xs text-slate-400">{selected.department}</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: "Email", value: selected.email },
                { label: "Phone", value: selected.phone },
                { label: "Shift", value: selected.shift },
                { label: "Status", value: selected.status },
                { label: "Joined", value: selected.dateJoined?.toDate?.()?.toLocaleDateString("en-IN") || "—" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-xs text-slate-400">{row.label}</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.value || "—"}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <GhostBtn className="flex-1 justify-center" onClick={() => { setSelected(null); toast("Attendance history opened"); }}>
                Attendance
              </GhostBtn>
              <GhostBtn className="flex-1 justify-center" onClick={() => { setSelected(null); toast("Payroll details opened"); }}>
                Payroll
              </GhostBtn>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Shift schedule modal */}
      {showShiftModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Weekly shift schedule</h3>
              <button onClick={() => setShowShiftModal(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-4 text-slate-400 font-medium">Employee</th>
                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                      <th key={d} className="text-center py-2 px-2 text-slate-400 font-medium">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {employees.slice(0, 8).map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 pr-4 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{e.name?.split(" ")[0]}</td>
                      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => {
                        const hasShift = !["Sun"].includes(d) || e.shift === "Night";
                        return (
                          <td key={d} className="py-2 px-2 text-center">
                            {hasShift ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                e.shift === "Morning" ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" :
                                e.shift === "Evening" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                                "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                              }`}>
                                {e.shift === "Morning" ? "M" : e.shift === "Evening" ? "E" : "N"}
                              </span>
                            ) : (
                              <span className="text-slate-200 dark:text-slate-700">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4 mt-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-100 dark:bg-sky-900/30" /> Morning</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" /> Evening</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-100 dark:bg-indigo-900/30" /> Night</span>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
