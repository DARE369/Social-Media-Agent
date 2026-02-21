/**
 * @file AdminSidebar.jsx
 * @description Sidebar navigation for Admin Control Plane.
 * 
 * Contains:
 * - Navigation links for admin sections
 * - Responsive collapse toggle
 */
import React from "react";
import { NavLink } from "react-router-dom";
import "../../styles/AdminDashboard.css";

export default function AdminSidebar({ isOpen, toggleSidebar }) {
  return (
    <aside className={`admin-sidebar ${isOpen ? "open" : "collapsed"}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-logo">SocialAI Admin</h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/app/admin" end className="sidebar-link">
          Dashboard
        </NavLink>

        <NavLink to="/app/admin/users" className="sidebar-link">
          Users
        </NavLink>

        <NavLink to="/app/admin/content/review" className="sidebar-link">
          Moderation
        </NavLink>

        <NavLink to="/app/admin/analytics" className="sidebar-link">
          Analytics
        </NavLink>

        <NavLink to="/app/admin/logs" className="sidebar-link">
          Logs
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button onClick={toggleSidebar} className="collapse-btn">
          {isOpen ? "Collapse" : "Expand"}
        </button>
      </div>
    </aside>
  );
}
