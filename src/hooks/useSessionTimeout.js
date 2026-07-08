// src/hooks/useSessionTimeout.js
//
// Auto-signs the user out after a period of inactivity (mouse, keyboard,
// touch, or scroll). Satisfies the "session timeout" security requirement
// without needing a server-side session store — Firebase Auth tokens stay
// valid, we just force a local sign-out and redirect to /login.

import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

export function useSessionTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const { isAuthenticated, logout } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
        window.location.href = "/login?reason=timeout";
      }, timeoutMs);
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, logout, timeoutMs]);
}
