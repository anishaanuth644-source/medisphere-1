// src/pages/analytics/AnalyticsPage.jsx

import React, { useState, useEffect } from "react";
import { BarChart3, Download, RefreshCw } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import { getRevenueTrend } from "../../services/dashboardService";
import { getPurchaseSourceStats, getTopPrescribedMedicines } from "../../services/pharmacyService";
import {
  GlassCard, SectionHeader, KPICard, GhostBtn, Skeleton,
} from "../../components/ui/index";
import { downloadCSV } from "../../utils/exportUtils";

const CHART_COLORS = ["#0ea5e9", "#14b8a6", "#6366f1", "#f59e0b", "#10b981", "#f43f5e"];

// Mock weekly patient trend (replace with aggregated Firestore data in production)
const PATIENT_TREND = [
  { week: "Week 1", new: 34, returning: 89, total: 123 },
  { week: "Week 2", new: 41, returning: 96, total: 137 },
  { week: "Week 3", new: 29, returning: 102, total: 131 },
  { week: "Week 4", new: 52, returning: 88, total: 140 },
  { week: "Week 5", new: 45, returning: 111, total: 156 },
  { week: "Week 6", new: 38, returning: 97, total: 135 },
];

const ATTENDANCE_TREND = [
  { day: "Mon", pct: 94 }, { day: "Tue", pct: 91 }, { day: "Wed", pct: 96 },
  { day: "Thu", pct: 89 }, { day: "Fri", pct: 93 }, { day: "Sat", pct: 87 }, { day: "Sun", pct: 82 },
];

export function AnalyticsPage() {
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [topMeds, setTopMeds] = useState([]);
  const [purchaseSource, setPurchaseSource] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [trend, meds, source] = await Promise.all([
        getRevenueTrend(6),
        getTopPrescribedMedicines(6),
        getPurchaseSourceStats(),
      ]);
      setRevenueTrend(trend);
      setTopMeds(meds);
      setPurchaseSource(source);
    } catch {
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sourceData = purchaseSource
    ? [
        { name: "In-house", value: purchaseSource.inHousePct },
        { name: "External", value: purchaseSource.externalPct },
      ]
    : [];

  const exportSummary = () => {
    downloadCSV(
      revenueTrend.map((r) => ({ Month: r.month, "Revenue (₹)": r.revenue })),
      "revenue-report.csv"
    );
    toast.success("Revenue report exported");
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Analytics & reporting" subtitle="Cross-module performance insights">
        <GhostBtn icon={RefreshCw} onClick={load}>Refresh</GhostBtn>
        <GhostBtn icon={Download} onClick={exportSummary}>Export CSV</GhostBtn>
      </SectionHeader>

      {/* Row 1: Revenue + Patient trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <SectionHeader title="Revenue trend" subtitle="Paid invoices — last 6 months" />
          {loading ? <Skeleton className="h-56" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueTrend.length ? revenueTrend : [
                { month: "Jan", revenue: 412000 }, { month: "Feb", revenue: 438000 },
                { month: "Mar", revenue: 465000 }, { month: "Apr", revenue: 441000 },
                { month: "May", revenue: 502000 }, { month: "Jun", revenue: 478000 },
              ]}>
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#revG)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Patient visits" subtitle="New vs returning — weekly" />
          {loading ? <Skeleton className="h-56" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={PATIENT_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="new" name="New" fill="#0ea5e9" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="returning" name="Returning" fill="#14b8a6" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      {/* Row 2: Attendance + Pharmacy source */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <SectionHeader title="Employee attendance" subtitle="This week (% present)" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ATTENDANCE_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[70, 100]}
                tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, "Attendance"]} />
              <Bar dataKey="pct" fill="#6366f1" radius={[6, 6, 0, 0]} name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Pharmacy source" subtitle="In-house vs external" />
          {loading ? <Skeleton className="h-40" /> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sourceData.length ? sourceData : [{ name: "In-house", value: 64 }, { name: "External", value: 36 }]}
                    dataKey="value" innerRadius={45} outerRadius={68} paddingAngle={3}>
                    <Cell fill="#0ea5e9" />
                    <Cell fill="#94a3b8" />
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs mt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  In-house {purchaseSource?.inHousePct ?? 64}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  External {purchaseSource?.externalPct ?? 36}%
                </span>
              </div>
            </>
          )}
        </GlassCard>
      </div>

      {/* Row 3: Top prescribed medicines + Bed occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <SectionHeader title="Top prescribed medicines" />
          {loading ? <Skeleton className="h-48" /> : topMeds.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No prescription data yet — seed Firestore to see data here.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topMeds} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false}
                  tickLine={false} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#14b8a6" radius={[0, 6, 6, 0]} name="Prescriptions" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Doctor performance" subtitle="Rating by specialization" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart layout="vertical" margin={{ left: 16 }} data={[
              { specialization: "Cardiology", rating: 4.7 },
              { specialization: "Pediatrics", rating: 4.5 },
              { specialization: "Orthopedics", rating: 4.3 },
              { specialization: "Neurology", rating: 4.6 },
              { specialization: "General Medicine", rating: 4.2 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="specialization" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false}
                tickLine={false} width={110} />
              <Tooltip formatter={(v) => [`${v} / 5`, "Rating"]} />
              <Bar dataKey="rating" fill="#6366f1" radius={[0, 6, 6, 0]} name="Rating" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Export panel */}
      <GlassCard>
        <SectionHeader title="Export reports" subtitle="Generate and download data for any module" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Revenue report", action: exportSummary },
            { label: "Patient list", action: () => toast("Export patients CSV — wire to patientService.getAllPatients()") },
            { label: "Pharmacy sales", action: () => toast("Export pharmacy sales CSV") },
            { label: "Attendance report", action: () => toast("Export attendance CSV") },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <Download size={15} className="text-slate-400 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
