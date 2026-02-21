/**
 * @file AdminLayout.jsx
 * @description Root admin layout shell (Navbar + Sidebar + Main content)
 * 
 * Provides a responsive flex-based layout that adapts between desktop and mobile.
 * Uses plain CSS to replicate Tailwind-style spacing, color, and transition utilities.
 */

import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AdminNavbar from "./components/AdminNavbar/AdminNavbar";
import AdminSidebar from "./components/AdminSidebar/AdminSidebar";
import "./styles/AdminDashboard.css";

const TABLET_QUERY = "(max-width: 1024px)";

function isTabletViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(TABLET_QUERY).matches;
}

export default function AdminLayout() {
  // State to handle sidebar collapse (for mobile and desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => !isTabletViewport());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia(TABLET_QUERY);
    const syncSidebar = (event) => {
      setIsSidebarOpen(!event.matches);
    };

    syncSidebar(media);
    media.addEventListener("change", syncSidebar);
    return () => media.removeEventListener("change", syncSidebar);
  }, []);

  return (
    <div className={`admin-shell ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      {/* Sidebar */}
      <AdminSidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      {isSidebarOpen && isTabletViewport() && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Close navigation panel"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="admin-main">
        {/* Navbar */}
        <AdminNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Content Area */}
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
