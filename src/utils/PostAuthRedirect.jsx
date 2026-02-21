import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getUserProfileAndRole } from "../services/authService";
import AuthLoadingOverlay from "../components/Shared/AuthLoadingOverlay";
import { resolvePostAuthPath } from "./authRouting";

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
          return;
        }

        const intendedPath = sessionStorage.getItem("socialai-redirect-after-login");
        sessionStorage.removeItem("socialai-redirect-after-login");

        setRedirectPath(
          resolvePostAuthPath({
            role,
            intendedPath,
          })
        );
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
      <AuthLoadingOverlay
        title="Preparing your workspace"
        description="Matching your account role and opening the right dashboard."
      />
    );
  }

  return <Navigate to={redirectPath} replace />;
}
