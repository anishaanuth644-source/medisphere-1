// src/pages/dashboard/DashboardPage.jsx

import React, { useEffect, useState } from "react";
import {
  UserRound, CalendarClock, BedDouble, Stethoscope, Siren,
  Pill, Users, Receipt, DollarSign,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getDashboardKPIs, getRevenueTrend } from "../../services/dashboardService";
import { KPICard, GlassCard, SectionHeader, Skeleton } from "../../components/ui/index";

const ROOM_COLORS = ["#0ea5e9", "#14b8a6", "#6366f1", "#f59e0b"];

export function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [kpiData, trend] = await Promise.all([
          getDashboardKPIs(),
          getRevenueTrend(6),
        ]);
        setKpis(kpiData);
        setRevenueTrend(trend);
      } catch (err) {
        console.error(err);
        setError("Could not load dashboard data. Check your Firebase connection.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard icon={UserRound} label="Total patients" value={kpis?.totalPatients} loading={loading} tone="blue" delta="+4.2% this month" />
        <KPICard icon={CalendarClock} label="Today's appointments" value={kpis?.todayAppointments} loading={loading} tone="teal" />
        <KPICard icon={BedDouble} label="Available beds" value={kpis?.availableBeds} loading={loading} tone="indigo" delta={kpis ? `of ${kpis.totalBeds} total` : null} />
        <KPICard icon={Stethoscope} label="Active doctors" value={kpis?.activeDoctors} loading={loading} tone="green" />
        <KPICard icon={Siren} label="Emergency cases (live)" value={kpis?.emergencyCases} loading={loading} tone="red" deltaTone="red" delta="currently in ER" />
        <KPICard icon={Pill} label="Low stock medicines" value={kpis?.lowStockCount} loading={loading} tone="amber" deltaTone="red" delta="need reorder" />
        <KPICard icon={Users} label="Attendance today" value={kpis?.attendancePct != null ? `${kpis.attendancePct}%` : null} loading={loading} tone="teal" />
        <KPICard icon={Receipt} label="Pending insurance claims" value={kpis?.pendingInsuranceClaims} loading={loading} tone="indigo" deltaTone="red" />
        <KPICard icon={DollarSign} label="Daily revenue" value={kpis?.dailyRevenue ? `₹${kpis.dailyRevenue.toLocaleString("en-IN")}` : "—"} loading={loading} tone="green" delta="See analytics for full breakdown" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <SectionHeader title="Revenue trend" subtitle="Paid invoices — last 6 months" />
          {loading ? (
            <Skeleton className="h-56" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Quick stats" />
          <div className="space-y-3">
            {[
              { label: "Appointment fill rate", value: "87%", color: "#0ea5e9" },
              { label: "Bed occupancy", value: kpis ? `${Math.round(((kpis.totalBeds - kpis.availableBeds) / (kpis.totalBeds || 1)) * 100)}%` : "—", color: "#14b8a6" },
              { label: "Expiring medicines", value: kpis?.expiringSoonCount ?? "—", color: "#f59e0b" },
              { label: "Attendance rate", value: kpis ? `${kpis.attendancePct}%` : "—", color: "#6366f1" },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">{s.label}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{s.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: typeof s.value === "string" && s.value.endsWith("%") ? s.value : "50%",
                      background: s.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
