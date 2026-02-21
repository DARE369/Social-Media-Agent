/**
 * @file AdminNavbar.jsx
 * @description Top navbar for Admin layout.
 * 
 * Contains:
 * - App logo / name
 * - Sidebar toggle (hamburger)
 * - Search bar
 * - Notification icon (placeholder)
 * - Admin avatar / profile
 */

import React from "react";
import "../../styles/AdminDashboard.css";
import { Bell, Menu } from "lucide-react"; // optional icons; you can remove if not installed

export default function AdminNavbar({ toggleSidebar }) {
  return (
    <nav className="admin-navbar">
      {/* Left Section */}
      <div className="navbar-left">
        <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
          <Menu size={22} />
        </button>
        <h1 className="navbar-title">Admin Control Panel</h1>
      </div>

      {/* Center Section */}
      <div className="navbar-center">
        <input type="text" placeholder="Search..." className="navbar-search" />
      </div>

      {/* Right Section */}
      <div className="navbar-right">
        <button className="navbar-icon-btn">
          <Bell size={20} />
        </button>
        <div className="navbar-profile">
          <img
            src="/assets/Profile.svg"
            alt="Admin avatar"
            className="navbar-avatar"
          />
        </div>
      </div>
    </nav>
  );
}
