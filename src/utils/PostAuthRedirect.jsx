import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getUserProfileAndRole } from "../services/authService";

export default function PostAuthRedirect() {
  const [redirectPath, setRedirectPath] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function determineRoute() {
      try {
        const { user, role } = await getUserProfileAndRole();
        if (!mounted) return;

        if (!user) {
          setRedirectPath("/login");
        } else if (role === "admin") {
          setRedirectPath("/app/admin");
        } else {
          setRedirectPath("/app/dashboard");
        }
      } catch (e) {
        console.error("PostAuthRedirect error:", e);
        if (mounted) setRedirectPath("/login");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    determineRoute();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting based on role...</p>
      </div>
    );
  }

  return <Navigate to={redirectPath} replace />;
}
