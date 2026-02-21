// src/router/router.jsx
import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "../App";
import LandingPage from "../pages/Landing/LandingPage";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import CalendarPageV2 from "../pages/CalendarPage/CalendarPageV2";
import UserDashboard from "../pages/Dashboard/UserDashboard";
import AdminLayout from "../admin/AdminLayout";
import AdminOverview from "../admin/pages/AdminOverview";
import AdminUsersPage from "../admin/pages/AdminUsersPage";
import AdminLogsPage from "../admin/pages/AdminLogsPage";
import AdminModerationPage from "../admin/pages/AdminModeration/AdminModerationPage";
import AdminAnalyticsPage from "../admin/pages/AdminAnalyticsPage";
import Settings from "../pages/Settings";
import AuthCallback from "../pages/Auth/AuthCallback";
import BrandKitPage from "../pages/Settings/BrandKitPage";

import ProtectedRoute from "../utils/protectedRoute";
import PostAuthRedirect from "../utils/PostAuthRedirect";
import GeneratePageV2 from "../pages/GeneratePage/GeneratePageV2";

export const router = createBrowserRouter(
  [
    // PUBLIC ROUTES
    { path: "/", element: <LandingPage /> },
    { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },
    { path: "/auth/callback", element: <AuthCallback /> },
    { path: "/generate", element: <Navigate to="/app/generate" replace /> },

    // PROTECTED APPLICATION SHELL
    {
      path: "/app",
      element: (
        <ProtectedRoute>
          <App />
        </ProtectedRoute>
      ),
      children: [
        // Default post-login redirect
        { index: true, element: <PostAuthRedirect /> },

        // Core user routes
        { path: "dashboard", element: <UserDashboard /> },
        { path: "generate", element: <GeneratePageV2 /> },
        { path: "calendar", element: <CalendarPageV2 /> },
        { path: "settings", element: <Settings /> },
        { path: "settings/brand-kit", element: <BrandKitPage /> },

        // Aliases used by new dashboard/sidebar items
        { path: "library", element: <Navigate to="/app/generate" replace /> },
        { path: "analytics", element: <Navigate to="/app/calendar" replace /> },
        { path: "profile", element: <Navigate to="/app/settings" replace /> },

        // Admin routes
        {
          path: "admin",
          element: (
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          ),
          children: [
            { index: true, element: <AdminOverview /> },
            { path: "users", element: <AdminUsersPage /> },
            { path: "logs", element: <AdminLogsPage /> },
            { path: "content/review", element: <AdminModerationPage /> },
            { path: "analytics", element: <AdminAnalyticsPage /> },
          ],
        },

        // fallback for unmatched /app routes
        { path: "*", element: <Navigate to="/app" replace /> },
      ],
    },

    // fallback for unmatched routes
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  {
    // Added future flags to silence v7 warnings
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  }
);
