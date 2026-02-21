// src/utils/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUserProfileAndRole } from "../services/authService";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const [status, setStatus] = useState({ loading: true, isAuth: false, isAdmin: false });
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const { user, role } = await getUserProfileAndRole();
        if (!mounted) return;

        const isAuth = !!user;
        const isAdmin = role === "admin";
        setStatus({ loading: false, isAuth, isAdmin });
      } catch (err) {
        console.error("ProtectedRoute error:", err);
        if (!mounted) return;
        setStatus({ loading: false, isAuth: false, isAdmin: false });
      }
    };

    check();

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  if (status.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!status.isAuth) {
    const intended = `${location.pathname}${location.search}${location.hash}`;
    if (intended && intended !== "/login") {
      sessionStorage.setItem("socialai-redirect-after-login", intended);
    }
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !status.isAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}