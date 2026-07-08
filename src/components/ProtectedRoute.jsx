// src/components/ProtectedRoute.jsx
//
// Wraps routes under /app/* with two checks:
//   1. User must be authenticated (Firebase Auth session exists + Firestore profile loaded)
//   2. User's role must include the requested module in ROLE_MODULES (canAccessModule)
//
// If either check fails we redirect immediately — the user never sees the page,
// preventing accidental data exposure on slow network hydration.

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessModule, defaultRouteForRole } from "../utils/rbac";
import { Spinner } from "./ui/index";

export function ProtectedRoute({ children, moduleKey }) {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  // Show a full-screen spinner while Firebase resolves the initial auth state.
  // Without this, the component would flash the redirect on every hard refresh.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the intended destination so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (moduleKey && !canAccessModule(role, moduleKey)) {
    // Authenticated but wrong role for this page — redirect to their
    // default landing page rather than a generic 403 page.
    return <Navigate to={defaultRouteForRole(role)} replace />;
  }

  return children;
}
