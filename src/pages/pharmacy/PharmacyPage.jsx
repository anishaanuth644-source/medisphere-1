// src/pages/pharmacy/PharmacyPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { Pill, Plus, Truck, AlertTriangle, QrCode, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";
import {
  getMedicines, getLowStockMedicines, getExpiringSoonMedicines,
  getPurchaseSourceStats, getTopPrescribedMedicines,
} from "../../services/pharmacyService";
import {
  GlassCard, SectionHeader, SearchInput, Badge,
  PrimaryBtn, GhostBtn, Skeleton,
} from "../../components/ui/index";
import { DataTable } from "../../components/DataTable";

export function PharmacyPage() {
  const [medicines, setMedicines] = useState([]);
  const [sourceStats, setSourceStats] = useState(null);
  const [topMeds, setTopMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      getMedicines(),
      getPurchaseSourceStats(),
      getTopPrescribedMedicines(5),
    ])
      .then(([meds, stats, top]) => {
        setMedicines(meds);
        setSourceStats(stats);
        setTopMeds(top);
      })
      .catch(() => toast.error("Failed to load pharmacy data"))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    if (!search.trim()) return medicines;
    return medicines.filter((m) => m.name?.toLowerCase().includes(search.toLowerCase()));
  }, [medicines, search]);

  const lowCount = medicines.filter((m) => m.stockQuantity < m.reorderLevel).length;
  const expiringCount = medicines.filter((m) => {
    const exp = m.expiryDate?.toDate?.();
    if (!exp) return false;
    const days = (exp - Date.now()) / 86400000;
    return days <= 30;
  }).length;

  const sourceChartData = sourceStats
    ? [
        { name: "In-house", value: sourceStats.inHousePct },
        { name: "External", value: sourceStats.externalPct },
      ]
    : [];

  return (
    <div className="space-y-4">
      <SectionHeader title="Pharmacy & inventory" subtitle="Stock, batches, expiry tracking & purchase analytics">
        <GhostBtn icon={Truck}>Suppliers</GhostBtn>
        <PrimaryBtn icon={Plus} onClick={() => toast("Open add-medicine form")}>Add medicine</PrimaryBtn>
      </SectionHeader>

      {/* Analytics cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard>
          <SectionHeader title="Purchase source" subtitle="In-house vs external prescriptions" />
          {loading ? (
            <Skeleton className="h-40" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sourceChartData} dataKey="value" innerRadius={45} outerRadius={68} paddingAngle={3}>
                    <Cell fill="#0ea5e9" />
                    <Cell fill="#94a3b8" />
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs mt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" /> In-house {sourceStats?.inHousePct ?? 0}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" /> External {sourceStats?.externalPct ?? 0}%
                </span>
              </div>
            </>
          )}
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <SectionHeader title="Most prescribed medicines" />
          {loading ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="space-y-3">
              {topMeds.map((m) => (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-44 truncate">{m.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-teal-500"
                      style={{ width: `${(m.count / (topMeds[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500 w-8 text-right">{m.count}</span>
                </div>
              ))}
              {topMeds.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No prescription data yet</p>
              )}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Alerts bar */}
      {(lowCount > 0 || expiringCount > 0) && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangle size={16} className="text-amber-500" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {lowCount > 0 && `${lowCount} medicine${lowCount > 1 ? "s" : ""} below reorder level`}
            {lowCount > 0 && expiringCount > 0 && " · "}
            {expiringCount > 0 && `${expiringCount} medicine${expiringCount > 1 ? "s" : ""} expiring within 30 days`}
          </p>
        </div>
      )}

      {/* Medicines table */}
      <GlassCard noPad>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center flex-wrap gap-3">
          <div className="w-64">
            <SearchInput value={search} onChange={setSearch} placeholder="Search medicines…" />
          </div>
        </div>
        <DataTable
          columns={["Medicine", "Batch", "Stock", "Reorder level", "Expiry", "Supplier", "Unit price", ""]}
          rows={rows}
          loading={loading}
          emptyIcon={Pill}
          emptyTitle="No medicines in catalog"
          emptySubtitle="Add your first medicine to get started."
          renderRow={(m) => {
            const expDate = m.expiryDate?.toDate?.();
            const daysToExp = expDate ? Math.ceil((expDate - Date.now()) / 86400000) : null;
            const expiringSoon = daysToExp !== null && daysToExp <= 30;
            const isLow = m.stockQuantity < m.reorderLevel;
            return (
              <tr key={m.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${isLow ? "bg-rose-50/30 dark:bg-rose-900/10" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <QrCode size={13} className="text-slate-300 shrink-0" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{m.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{m.batchNumber}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm ${isLow ? "text-rose-600 font-semibold" : "text-slate-600 dark:text-slate-300"}`}>
                    {m.stockQuantity}
                  </span>
                  {isLow && <Badge tone="red" className="ml-1">Low</Badge>}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{m.reorderLevel}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm ${expiringSoon ? "text-amber-600 font-medium" : "text-slate-500"}`}>
                    {expDate?.toLocaleDateString("en-IN") || "—"}
                  </span>
                  {expiringSoon && <Badge tone="amber" className="ml-1">{daysToExp}d</Badge>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">{m.supplierName || "—"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">₹{m.unitPrice}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toast("Record stock movement — open restock modal")}
                    title="Adjust stock"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <RefreshCw size={14} />
                  </button>
                </td>
              </tr>
            );
          }}
        />
      </GlassCard>
    </div>
  );
}
