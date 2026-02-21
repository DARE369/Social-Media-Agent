/**
 * @file UserListRow.jsx
 * @description Single row item for UserListPanel. Displays profile pic, name, email, and status.
 */

import React from "react";
import "../../styles/AdminDashboard.css";

export default function UserListRow({ user, isSelected, onClick }) {
  return (
    <div
      className={`user-list-row ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      <img src={user.avatar} alt={user.name} className="user-avatar" />
      <div className="user-info">
        <p className="user-name">{user.name}</p>
        <p className="user-email">{user.email}</p>
      </div>
      <span className={`status-badge ${user.status.toLowerCase()}`}>
        {user.status}
      </span>
    </div>
  );
}
