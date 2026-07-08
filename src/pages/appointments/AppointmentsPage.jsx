// src/pages/appointments/AppointmentsPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { CalendarClock, Plus, Filter, Bell, X, Clock, User, Stethoscope } from "lucide-react";
import toast from "react-hot-toast";
import { getAppointments, updateAppointmentStatus, cancelAppointment } from "../../services/appointmentService";
import { useAuth } from "../../context/AuthContext";
import {
  GlassCard, SectionHeader, SearchInput, StatusBadge, Badge,
  PrimaryBtn, GhostBtn, ConfirmDialog, Skeleton,
} from "../../components/ui/index";
import { DataTable } from "../../components/DataTable";

const STATUS_FLOW = {
  Confirmed: ["Waiting", "Cancelled"],
  Waiting: ["In consultation", "Cancelled"],
  "In consultation": ["Completed"],
  Completed: [],
  Cancelled: [],
};

const STATUS_COUNTS = ["Confirmed", "Waiting", "In consultation", "Completed", "Cancelled"];

export function AppointmentsPage() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    getAppointments({ date: new Date() })
      .then(setAppointments)
      .catch(() => toast.error("Failed to load appointments"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let rows = appointments;
    if (filterStatus !== "all") rows = rows.filter((a) => a.status === filterStatus);
    if (search.trim()) {
      const t = search.toLowerCase();
      rows = rows.filter(
        (a) =>
          a.patientName?.toLowerCase().includes(t) ||
          a.doctorName?.toLowerCase().includes(t)
      );
    }
    return rows;
  }, [appointments, filterStatus, search]);

  const counts = useMemo(() =>
    Object.fromEntries(STATUS_COUNTS.map((s) => [s, appointments.filter((a) => a.status === s).length])),
    [appointments]
  );

  const handleStatusChange = async (appt, newStatus) => {
    try {
      await updateAppointmentStatus(appt.id, newStatus, profile);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status: newStatus } : a))
      );
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelAppointment(cancelTarget.id, profile);
      setAppointments((prev) =>
        prev.map((a) => (a.id === cancelTarget.id ? { ...a, status: "Cancelled" } : a))
      );
      toast.success("Appointment cancelled");
    } catch {
      toast.error("Failed to cancel appointment");
    } finally {
      setCancelTarget(null);
    }
  };

  const sendReminder = (appt) => {
    toast.success(`Reminder sent to ${appt.patientName}`);
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Appointment management" subtitle="Live queue across all departments today">
        <GhostBtn icon={Filter}>By doctor</GhostBtn>
        <PrimaryBtn icon={Plus} onClick={() => setShowNewForm(true)}>
          Schedule appointment
        </PrimaryBtn>
      </SectionHeader>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STATUS_COUNTS.map((s) => {
          const tones = {
            Confirmed: "border-sky-200 bg-sky-50/50 dark:bg-sky-900/10",
            Waiting: "border-amber-200 bg-amber-50/50 dark:bg-amber-900/10",
            "In consultation": "border-teal-200 bg-teal-50/50 dark:bg-teal-900/10",
            Completed: "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10",
            Cancelled: "border-slate-200 bg-slate-50/50 dark:bg-slate-900/10",
          };
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={`rounded-xl border p-3 text-left transition-all ${tones[s]} ${filterStatus === s ? "ring-2 ring-sky-400" : ""}`}
            >
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{counts[s] ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s}</p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <GlassCard noPad>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-3 items-center">
          <div className="w-72">
            <SearchInput value={search} onChange={setSearch} placeholder="Search patient or doctor…" />
          </div>
          {filterStatus !== "all" && (
            <button
              onClick={() => setFilterStatus("all")}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-500 transition-colors"
            >
              <X size={13} /> Clear filter
            </button>
          )}
        </div>

        <DataTable
          columns={["Time", "Patient", "Doctor", "Type", "Status", "Actions"]}
          rows={filtered}
          loading={loading}
          emptyIcon={CalendarClock}
          emptyTitle="No appointments found"
          emptySubtitle="Schedule a new appointment or change the status filter."
          renderRow={(a) => (
            <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {a.scheduledAt?.toDate?.()?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) || "—"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <User size={13} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{a.patientName}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Stethoscope size={13} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{a.doctorName}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={a.type === "Follow-up" ? "teal" : "blue"}>{a.type}</Badge>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Next status transitions */}
                  {STATUS_FLOW[a.status]?.filter((s) => s !== "Cancelled").map((nextStatus) => (
                    <button
                      key={nextStatus}
                      onClick={() => handleStatusChange(a, nextStatus)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100 transition-colors"
                    >
                      → {nextStatus}
                    </button>
                  ))}
                  {/* Reminder */}
                  {["Confirmed", "Waiting"].includes(a.status) && (
                    <button
                      onClick={() => sendReminder(a)}
                      title="Send reminder"
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                    >
                      <Bell size={14} />
                    </button>
                  )}
                  {/* Cancel */}
                  {!["Completed", "Cancelled"].includes(a.status) && (
                    <button
                      onClick={() => setCancelTarget(a)}
                      title="Cancel appointment"
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      </GlassCard>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel appointment?"
        body={`Cancel the appointment for ${cancelTarget?.patientName} with ${cancelTarget?.doctorName}? The patient will be notified.`}
        confirmLabel="Cancel appointment"
        destructive
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancel}
      />

      {/* New appointment form modal (stub) */}
      {showNewForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Schedule appointment</h3>
              <button onClick={() => setShowNewForm(false)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              {["Patient", "Doctor", "Date & time", "Type"].map((field) => (
                <div key={field}>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">{field}</label>
                  <div className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-sm text-slate-400">
                    Select {field.toLowerCase()}…
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <GhostBtn className="flex-1 justify-center" onClick={() => setShowNewForm(false)}>Cancel</GhostBtn>
              <PrimaryBtn
                className="flex-1 justify-center"
                onClick={() => {
                  setShowNewForm(false);
                  toast.success("Appointment scheduled");
                }}
              >
                Confirm booking
              </PrimaryBtn>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
