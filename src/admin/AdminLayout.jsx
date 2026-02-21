/**
 * @file AdminLayout.jsx
 * @description Root admin layout shell (Navbar + Sidebar + Main content)
 * 
 * Provides a responsive flex-based layout that adapts between desktop and mobile.
 * Uses plain CSS to replicate Tailwind-style spacing, color, and transition utilities.
 */

import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminNavbar from "./components/AdminNavbar/AdminNavbar";
import AdminSidebar from "./components/AdminSidebar/AdminSidebar";
import "./styles/AdminDashboard.css";

export default function AdminLayout() {
  // State to handle sidebar collapse (for mobile and desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className={`admin-shell ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      {/* Sidebar */}
      <AdminSidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

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
