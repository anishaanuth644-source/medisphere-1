// src/pages/auth/LoginPage.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HeartPulse, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { defaultRouteForRole } from "../../utils/rbac";
import { PrimaryBtn } from "../../components/ui/index";
import { Spinner } from "../../components/ui/index";

export function LoginPage() {
  const { login, resetPassword, isAuthenticated, role, authError, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");
  const [stage, setStage] = useState("login"); // "login" | "forgot" | "reset_sent"
  const [successMsg, setSuccessMsg] = useState("");

  // If already logged in, redirect to the right dashboard immediately
  useEffect(() => {
    if (isAuthenticated && role) {
      const from = location.state?.from?.pathname || defaultRouteForRole(role);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, role, navigate, location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError("");
    if (!email || !password) { setLocalError("Please fill in both fields."); return; }
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.success) setLocalError(result.message);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLocalError("");
    if (!email) { setLocalError("Enter your email address above."); return; }
    setSubmitting(true);
    const result = await resetPassword(email);
    setSubmitting(false);
    if (result.success) {
      setStage("reset_sent");
      setSuccessMsg(`Password reset link sent to ${email}. Check your inbox.`);
    } else {
      setLocalError(result.message);
    }
  };

  const error = localError || authError;

  const isTimeout = new URLSearchParams(location.search).get("reason") === "timeout";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 p-4">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-400/20 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-400/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 shadow-lg shadow-sky-500/30 mb-3">
            <HeartPulse className="text-white" size={26} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">MediSphere</h1>
          <p className="text-sm text-slate-500">Smart Digital Hospital Ecosystem</p>
        </div>

        {/* Session timeout banner */}
        {isTimeout && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
            Your session expired due to inactivity. Please sign in again.
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl p-6">
          {stage === "reset_sent" ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">📬</div>
              <p className="font-semibold text-slate-700 mb-1">Check your email</p>
              <p className="text-sm text-slate-500">{successMsg}</p>
              <button onClick={() => setStage("login")} className="mt-5 text-sm text-sky-600 hover:underline">
                Back to sign in
              </button>
            </div>
          ) : stage === "forgot" ? (
            <form onSubmit={handleReset}>
              <h2 className="font-semibold text-slate-700 mb-1">Reset password</h2>
              <p className="text-xs text-slate-400 mb-4">Enter your email and we'll send a reset link.</p>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
                <Mail size={15} className="text-slate-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="outline-none text-sm w-full text-slate-700"
                />
              </div>
              {error && <p className="text-xs text-rose-500 mb-3">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStage("login")} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">
                  Back
                </button>
                <PrimaryBtn type="submit" className="flex-1 justify-center" disabled={submitting}>
                  {submitting ? <Spinner size={16} /> : "Send reset link"}
                </PrimaryBtn>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
                <Mail size={15} className="text-slate-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@medisphere.health" autoComplete="email"
                  className="outline-none text-sm w-full text-slate-700"
                />
              </div>

              <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
              <div className="flex items-center gap-2 mb-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
                <Lock size={15} className="text-slate-400" />
                <input
                  type={showPw ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="outline-none text-sm w-full text-slate-700"
                />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <button type="button" onClick={() => { setStage("forgot"); setLocalError(""); }} className="text-xs text-sky-600 hover:underline mb-4 block">
                Forgot password?
              </button>

              {error && <p className="text-xs text-rose-500 mb-3">{error}</p>}

              <PrimaryBtn type="submit" className="w-full justify-center" disabled={submitting || loading}>
                {submitting ? <Spinner size={16} /> : "Sign in"}
              </PrimaryBtn>

              <p className="text-[11px] text-slate-400 text-center mt-3">
                Session auto-expires after 20 minutes of inactivity.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
