// src/context/AuthContext.jsx
//
// Wraps Firebase Auth state + the corresponding users/{uid} Firestore
// document (which carries the `role` field RBAC depends on). Everything
// downstream (ProtectedRoute, Sidebar, page-level checks) reads from this
// context rather than calling Firebase directly.

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { logAuditEvent } from "../services/auditService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // users/{uid} document, includes `role`
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (!data.active) {
              // Account has been deactivated by a Super Admin — sign out
              // immediately rather than letting a deactivated user sit on
              // a stale session.
              await firebaseSignOut(auth);
              setProfile(null);
              setAuthError("This account has been deactivated. Contact your administrator.");
            } else {
              setProfile({ uid: user.uid, ...data });
              updateDoc(doc(db, "users", user.uid), { lastLoginAt: serverTimestamp() }).catch(() => {});
            }
          } else {
            // Auth user exists but has no Firestore profile/role yet.
            // This happens if an account was created in the Firebase Auth
            // console directly instead of through the provisioning flow.
            setProfile(null);
            setAuthError("No role is configured for this account. Ask a Super Admin to provision your profile.");
          }
        } catch (err) {
          console.error("Failed to load user profile:", err);
          setAuthError("Could not load your profile. Check your connection and try again.");
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await logAuditEvent({ action: "login", userId: cred.user.uid });
      return { success: true };
    } catch (err) {
      const message = mapAuthError(err.code);
      setAuthError(message);
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    if (firebaseUser) {
      await logAuditEvent({ action: "logout", userId: firebaseUser.uid }).catch(() => {});
    }
    await firebaseSignOut(auth);
  }, [firebaseUser]);

  const resetPassword = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err) {
      return { success: false, message: mapAuthError(err.code) };
    }
  }, []);

  const value = {
    firebaseUser,
    profile,
    role: profile?.role || null,
    isAuthenticated: !!firebaseUser && !!profile,
    loading,
    authError,
    login,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function mapAuthError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}
