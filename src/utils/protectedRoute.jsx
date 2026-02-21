// src/utils/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUserProfileAndRole } from "../services/authService";
import { useAuth } from "../Context/AuthContext";
import AuthLoadingOverlay from "../components/Shared/AuthLoadingOverlay";
import { USER_HOME_PATH } from "./authRouting";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading: authLoading } = useAuth();
  const [adminStatus, setAdminStatus] = useState({
    loading: requireAdmin,
    isAdmin: false,
  });
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    if (!requireAdmin) {
      setAdminStatus({ loading: false, isAdmin: false });
      return () => {
        mounted = false;
      };
    }

    if (authLoading) {
      setAdminStatus((prev) => ({ ...prev, loading: true }));
      return () => {
        mounted = false;
      };
    }

    if (!user) {
      setAdminStatus({ loading: false, isAdmin: false });
      return () => {
        mounted = false;
      };
    }

    const checkAdminRole = async () => {
      try {
        const { role } = await getUserProfileAndRole();
        if (!mounted) return;

        const isAdmin = role === "admin";
        setAdminStatus({ loading: false, isAdmin });
      } catch (err) {
        console.error("ProtectedRoute error:", err);
        if (!mounted) return;
        setAdminStatus({ loading: false, isAdmin: false });
      }
    };

    checkAdminRole();

    return () => {
      mounted = false;
    };
  }, [authLoading, user?.id, requireAdmin]);

  if (authLoading) {
    return (
      <AuthLoadingOverlay
        title="Checking your authentication"
        description="Securing your session and loading your workspace access."
      />
    );
  }

  if (!user) {
    const intended = `${location.pathname}${location.search}${location.hash}`;
    if (intended && intended !== "/login") {
      sessionStorage.setItem("socialai-redirect-after-login", intended);
    }
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && adminStatus.loading) {
    return (
      <AuthLoadingOverlay
        title="Verifying admin access"
        description="Checking your role permissions before opening the admin workspace."
      />
    );
  }

  if (requireAdmin && !adminStatus.isAdmin) {
    return <Navigate to={USER_HOME_PATH} replace />;
  }

  return children;
}
