import React from "react";
import { Outlet } from "react-router-dom";
import "./styles/AdminDashboard.css"; // global admin styles

export default function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      {/* Optional: add a header, sidebar, or nav here */}
      <AdminLayout>
        <Outlet /> {/* Render the child page (Overview, Users, Logs, etc.) */}
      </AdminLayout>
    </div>
  );
}
