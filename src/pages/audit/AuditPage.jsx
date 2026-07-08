// src/pages/audit/AuditPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { ScrollText, Download, Filter, X } from "lucide-react";
import toast from "react-hot-toast";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  GlassCard, SectionHeader, SearchInput, Badge, GhostBtn, Skeleton,
} from "../../components/ui/index";
import { DataTable } from "../../components/DataTable";
import { downloadCSV } from "../../utils/exportUtils";

const ACTION_COLORS = {
  login: "green", logout: "gray",
  patient_registered: "blue", patient_record_update: "blue",
  stock_update: "amber", billing_change: "indigo",
  prescription_update: "teal", appointment_status_update: "blue",
  emergency_logged: "red",
};

const ACTION_LABELS = {
  login: "Login",
  logout: "Logout",
  patient_registered: "Patient registered",
  patient_record_update: "Record updated",
  stock_update: "Stock updated",
  billing_change: "Billing changed",
  prescription_update: "Prescription updated",
  appointment_status_update: "Appointment updated",
  emergency_logged: "Emergency logged",
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

async function getAuditLogs(limitCount = 200) {
  const snap = await getDocs(
    query(collection(db, "audit_logs"), orderBy("createdAt", "desc"), limit(limitCount))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    getAuditLogs()
      .then(setLogs)
      .catch(() => toast.error("Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let rows = logs;
    if (actionFilter !== "all") rows = rows.filter((l) => l.action === actionFilter);
    if (search.trim()) {
      const t = search.toLowerCase();
      rows = rows.filter(
        (l) =>
          l.userName?.toLowerCase().includes(t) ||
          l.action?.toLowerCase().includes(t) ||
          l.targetCollection?.toLowerCase().includes(t) ||
          l.userId?.toLowerCase().includes(t)
      );
    }
    return rows;
  }, [logs, search, actionFilter]);

  const exportRows = () =>
    filtered.map((l) => ({
      "User": l.userName || l.userId,
      "Action": ACTION_LABELS[l.action] || l.action,
      "Collection": l.targetCollection || "—",
      "Document ID": l.targetDocId || "—",
      "Timestamp": l.createdAt?.toDate?.()?.toLocaleString("en-IN") || "—",
      "IP Address": l.ipAddress || "—",
    }));

  return (
    <div className="space-y-5">
      <SectionHeader title="Audit logs" subtitle="Every critical action, timestamped and tamper-proof">
        <GhostBtn icon={Filter} onClick={() => setShowFilters((s) => !s)}>
          {showFilters ? "Hide filters" : "Filters"}
        </GhostBtn>
        <GhostBtn icon={Download} onClick={() => { downloadCSV(exportRows(), "audit-logs.csv"); toast.success("Exported"); }}>
          Export CSV
        </GhostBtn>
      </SectionHeader>

      {/* Info banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
        <ScrollText size={16} className="shrink-0 text-slate-400" />
        Audit logs are append-only — no entry can be edited or deleted, even by Super Admins. Only Super Admins can read this collection.
      </div>

      {/* Filters */}
      {showFilters && (
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Filter by action</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActionFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                actionFilter === "all"
                  ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white border-transparent"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              All actions
            </button>
            {ALL_ACTIONS.map((a) => (
              <button
                key={a}
                onClick={() => setActionFilter(a)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  actionFilter === a
                    ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white border-transparent"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {ACTION_LABELS[a]}
              </button>
            ))}
          </div>
          {actionFilter !== "all" && (
            <button
              onClick={() => setActionFilter("all")}
              className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={12} /> Clear filter
            </button>
          )}
        </GlassCard>
      )}

      <GlassCard noPad>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-3 items-center justify-between">
          <div className="w-72">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by user, action, or collection…" />
          </div>
          <span className="text-xs text-slate-400">{filtered.length} entries</span>
        </div>

        <DataTable
          columns={["User", "Action", "Affected collection", "Document ID", "Timestamp"]}
          rows={filtered}
          loading={loading}
          emptyIcon={ScrollText}
          emptyTitle="No audit logs found"
          emptySubtitle="Audit entries appear here as users perform critical actions."
          pageSize={15}
          exportRows={exportRows}
          exportFilename="audit-logs.csv"
          renderRow={(l) => (
            <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {l.userName || "System"}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">{l.userId?.slice(0, 12)}…</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={ACTION_COLORS[l.action] || "gray"}>
                  {ACTION_LABELS[l.action] || l.action}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                {l.targetCollection || "—"}
              </td>
              <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                {l.targetDocId ? l.targetDocId.slice(0, 12) + "…" : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                {l.createdAt?.toDate?.()?.toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit", second: "2-digit",
                }) || "—"}
              </td>
            </tr>
          )}
        />
      </GlassCard>
    </div>
  );
}
