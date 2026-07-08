// src/pages/notifications/NotificationsPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { Bell, Package, Clock, CalendarClock, ShieldCheck, Siren, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  collection, updateDoc, doc,
  query, orderBy, serverTimestamp, onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  GlassCard, SectionHeader, Badge, KPICard, GhostBtn, PrimaryBtn,
} from "../../components/ui/index";

const TYPE_META = {
  low_stock: { icon: Package, label: "Low stock" },
  expiry: { icon: Clock, label: "Expiry alert" },
  appointment_reminder: { icon: CalendarClock, label: "Appointment" },
  insurance_expiry: { icon: ShieldCheck, label: "Insurance" },
  emergency: { icon: Siren, label: "Emergency" },
  follow_up: { icon: Bell, label: "Follow-up" },
};

const SEVERITY_STYLES = {
  critical: {
    border: "border-l-4 border-rose-400",
    icon: "bg-rose-500/15 text-rose-500",
    badge: "red",
  },
  warning: {
    border: "border-l-4 border-amber-400",
    icon: "bg-amber-500/15 text-amber-500",
    badge: "amber",
  },
  info: {
    border: "border-l-4 border-sky-400",
    icon: "bg-sky-500/15 text-sky-500",
    badge: "blue",
  },
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        toast.error("Failed to load notifications");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    let rows = notifications;
    if (severityFilter !== "all") rows = rows.filter((n) => n.severity === severityFilter);
    if (typeFilter !== "all") rows = rows.filter((n) => n.type === typeFilter);
    return rows;
  }, [notifications, severityFilter, typeFilter]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const criticalCount = notifications.filter((n) => n.severity === "critical").length;

  const markRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    try {
      await Promise.all(unread.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true })));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Notifications" subtitle="System-wide alerts — real-time updates">
        {unreadCount > 0 && (
          <GhostBtn icon={Check} onClick={markAllRead}>Mark all read</GhostBtn>
        )}
      </SectionHeader>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard icon={Bell} label="Total notifications" value={notifications.length} tone="blue" loading={loading} />
        <KPICard icon={Bell} label="Unread" value={unreadCount} tone="amber" deltaTone={unreadCount > 0 ? "red" : "green"} loading={loading} />
        <KPICard icon={Siren} label="Critical alerts" value={criticalCount} tone="red" deltaTone="red" loading={loading} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5">
          {["all", "critical", "warning", "info"].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all capitalize ${
                severityFilter === s
                  ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white border-transparent"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {s === "all" ? "All severities" : s}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...Object.keys(TYPE_META)].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                typeFilter === t
                  ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-800 border-transparent"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {t === "all" ? "All types" : TYPE_META[t]?.label || t}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-200/50 dark:bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="text-center py-16">
          <div className="text-4xl mb-3">🔔</div>
          <p className="font-medium text-slate-600 dark:text-slate-300">No notifications</p>
          <p className="text-sm text-slate-400 mt-1">You're all caught up!</p>
        </GlassCard>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type] || { icon: Bell, label: n.type };
            const style = SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.info;
            const IconComp = meta.icon;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 backdrop-blur-xl transition-all ${
                  n.read
                    ? "bg-white/40 dark:bg-slate-900/30 opacity-60"
                    : `bg-white/70 dark:bg-slate-900/55 shadow-sm ${style.border}`
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${style.icon}`}>
                  <IconComp size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Badge tone={style.badge}>{meta.label}</Badge>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" title="Unread" />
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {n.createdAt?.toDate?.()?.toLocaleString("en-IN", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    }) || "—"}
                    {n.targetRole && ` · For: ${n.targetRole.replace("_", " ")}`}
                  </p>
                </div>

                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    title="Mark as read"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 shrink-0"
                  >
                    <Check size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
