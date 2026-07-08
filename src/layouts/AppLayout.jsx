// src/layouts/AppLayout.jsx
//
// The persistent shell rendered for every authenticated page: collapsible
// sidebar, topbar with search/notifications/profile, and a main content slot.

import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  HeartPulse, LayoutDashboard, Users, Stethoscope, UserRound,
  CalendarClock, FileText, Pill, FlaskConical, Receipt, BedDouble,
  Siren, Bell, Star, BarChart3, ScrollText, LogOut, ChevronLeft,
  ChevronRight, Menu, Sun, Moon, Search, ChevronDown, Settings,
  ShieldCheck, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSessionTimeout } from "../hooks/useSessionTimeout";
import { canAccessModule, ROLES } from "../utils/rbac";

const MODULE_META = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "patients", label: "Patients", icon: UserRound },
  { key: "appointments", label: "Appointments", icon: CalendarClock },
  { key: "doctors", label: "Doctors", icon: Stethoscope },
  { key: "employees", label: "Employees", icon: Users },
  { key: "records", label: "Medical records", icon: FileText },
  { key: "pharmacy", label: "Pharmacy & inventory", icon: Pill },
  { key: "lab", label: "Laboratory", icon: FlaskConical },
  { key: "billing", label: "Billing & insurance", icon: Receipt },
  { key: "admissions", label: "Admissions & rooms", icon: BedDouble },
  { key: "emergency", label: "Emergency", icon: Siren },
  { key: "analytics", label: "Analytics & reports", icon: BarChart3 },
  { key: "feedback", label: "Feedback", icon: Star },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "audit", label: "Audit logs", icon: ScrollText },
];

export function AppLayout({ children }) {
  const { role, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("ms_dark") === "true");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useSessionTimeout();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("ms_dark", dark);
  }, [dark]);

  const visibleModules = MODULE_META.filter((m) => canAccessModule(role, m.key));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const SidebarContent = (
    <div className="h-full flex flex-col bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/60">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-md shadow-sky-500/30 shrink-0">
          <HeartPulse className="text-white" size={18} />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-sm text-slate-800 dark:text-slate-100">MediSphere</p>
            <p className="text-[10px] text-slate-400">Smart Hospital OS</p>
          </div>
        )}
      </div>

      {/* Role label */}
      {!collapsed && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/40">
          <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
            {ROLES[role]?.label || role}
          </p>
          <p className="text-[11px] text-slate-400 truncate">{profile?.email}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto thin-scrollbar px-2.5 py-1 space-y-0.5">
        {visibleModules.map(({ key, label, icon: Icon }) => (
          <NavLink
            key={key}
            to={`/app/${key}`}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/25"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-teal-50/40 dark:bg-slate-950 dark:bg-none relative`}>
      {/* Ambient background blobs */}
      <div className="fixed top-[-15%] right-[-10%] w-[40%] h-[40%] rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-15%] left-[-10%] w-[40%] h-[40%] rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:block fixed top-0 left-0 h-full z-30 transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {SidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 left-0 h-full w-64 z-50">{SidebarContent}</aside>
        </div>
      )}

      {/* Main content area */}
      <div className={`relative z-10 transition-all duration-300 ${collapsed ? "md:ml-[72px]" : "md:ml-64"}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/70 backdrop-blur-xl">
          {/* Mobile menu */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* Desktop collapse toggle */}
          <button
            className="hidden md:flex p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Global search */}
          <div className="hidden lg:flex items-center gap-2 flex-1 max-w-md px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60">
            <Search size={15} className="text-slate-400" />
            <input
              placeholder="Search patients, doctors, invoices…"
              className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="flex-1 lg:flex-none" />

          {/* Controls */}
          <div className="flex items-center gap-1.5 relative">
            {/* Dark mode */}
            <button
              onClick={() => setDark((d) => !d)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen((o) => !o); setProfileOpen(false); }}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notifications</p>
                    <button onClick={() => setNotifOpen(false)}><X size={15} className="text-slate-400" /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {[
                      { icon: "💊", text: "Insulin Glargine stock below reorder level (32 units)", time: "12 min ago", color: "amber" },
                      { icon: "🚨", text: "Critical emergency case incoming — ETA 6 min", time: "5 min ago", color: "red" },
                      { icon: "📋", text: "3 unconfirmed appointments for Dr. Mehta tomorrow", time: "2 hr ago", color: "blue" },
                    ].map((n, i) => (
                      <div key={i} className="flex gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <span className="text-base">{n.icon}</span>
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{n.text}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile menu */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen((o) => !o); setNotifOpen(false); }}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                  {profile?.displayName?.[0] || "U"}
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-1.5 z-50">
                  <div className="px-3 py-2 mb-1 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{profile?.displayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{ROLES[role]?.label}</p>
                  </div>
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Settings size={15} /> Account settings
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <ShieldCheck size={15} /> Security
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
