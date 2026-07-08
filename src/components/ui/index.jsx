// src/components/ui/index.jsx
//
// Shared primitive UI components used across all pages.
// All visual decisions live here — page files import from this file only,
// never hardcode Tailwind class strings for repeated elements.

import React from "react";
import { AlertTriangle, Check, X, XCircle, Activity } from "lucide-react";

// ─── Spinner ────────────────────────────────────────────────────────────────

export function Spinner({ size = 24, className = "" }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-slate-200 border-t-sky-500 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// ─── Glass card ─────────────────────────────────────────────────────────────

export function GlassCard({ children, className = "", noPad = false }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/60 dark:border-sky-900/30 bg-white/70 dark:bg-slate-900/55 backdrop-blur-xl shadow-sm transition-colors ${noPad ? "" : "p-5"} ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

const BADGE_TONES = {
  blue: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  teal: "bg-teal-500/15 text-teal-600 dark:text-teal-300",
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  red: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  gray: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
};

export function Badge({ children, tone = "blue" }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE_TONES[tone] || BADGE_TONES.blue}`}>
      {children}
    </span>
  );
}

// Maps common status strings to tones — used everywhere status columns appear.
const STATUS_TONE_MAP = {
  Confirmed: "blue", Waiting: "amber", "In consultation": "teal",
  Completed: "green", Cancelled: "red",
  Paid: "green", Pending: "amber", Overdue: "red", "Insurance review": "indigo",
  Active: "green", "On leave": "amber", Deactivated: "red",
  Requested: "gray", "Sample collected": "blue", "In progress": "amber", "Report ready": "green",
  Incoming: "red", "In ER": "amber", Stabilized: "blue", Admitted: "green",
  Critical: "red", High: "amber", Moderate: "blue",
};

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE_MAP[status] || "gray"}>{status}</Badge>;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-700/50 ${className}`} />
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="p-4 rounded-2xl bg-sky-500/10 text-sky-500 mb-3">
        <Icon size={28} />
      </div>
      <p className="font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {subtitle && (
        <p className="text-sm text-slate-400 mt-1 max-w-sm">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
// Note: for the real app, use react-hot-toast (already in package.json) instead
// of this lightweight version. Call `toast.success(...)` / `toast.error(...)`.
// This component is kept for pattern reference and storybook-style demos.

export function Toast({ toast: t, onClose }) {
  if (!t) return null;
  const config = {
    success: { icon: Check, bg: "bg-emerald-500" },
    error: { icon: XCircle, bg: "bg-rose-500" },
    info: { icon: Activity, bg: "bg-sky-500" },
  };
  const { icon: Icon, bg } = config[t.tone] || config.info;
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-xl ${bg}`}>
      <Icon size={16} />
      <span className="text-sm font-medium">{t.message}</span>
      <button onClick={onClose}><X size={14} /></button>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

export function ConfirmDialog({ open, title, body, onConfirm, onCancel, confirmLabel = "Confirm", destructive = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
            <AlertTriangle size={18} />
          </div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{body}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${destructive ? "bg-rose-500 hover:bg-rose-600" : "bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

export function PrimaryBtn({ children, onClick, icon: Icon, className = "", disabled = false, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 shadow-md shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function GhostBtn({ children, onClick, icon: Icon, className = "", disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 ${className}`}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// ─── Search input ─────────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60">
      <svg className="text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
      />
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

const KPI_TONES = {
  blue: "from-sky-500/20 to-sky-500/5 text-sky-500",
  teal: "from-teal-500/20 to-teal-500/5 text-teal-500",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-500",
  red: "from-rose-500/20 to-rose-500/5 text-rose-500",
  indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-500",
  green: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
};

export function KPICard({ icon: Icon, label, value, delta, deltaTone = "green", tone = "blue", loading = false }) {
  if (loading) return <Skeleton className="h-28" />;
  return (
    <GlassCard className="relative overflow-hidden">
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${KPI_TONES[tone]} blur-2xl opacity-60`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1.5">{label}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value ?? "—"}</p>
          {delta && (
            <p className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${deltaTone === "green" ? "text-emerald-500" : "text-rose-500"}`}>
              {delta}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${KPI_TONES[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </GlassCard>
  );
}
