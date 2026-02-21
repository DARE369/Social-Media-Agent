// src/components/User/StatusBadge.jsx
import React from "react";
import "../../styles/UserDashboard.css";

export default function StatusBadge({ status }) {
  let bgColor = "#ccc";

  if (status === "Draft") bgColor = "#f2994a"; // Orange
  if (status === "Review") bgColor = "#d62828"; // Red
  if (status === "Approved") bgColor = "#27ae60"; // Green

  return (
    <span className="status-badge" style={{ backgroundColor: bgColor }}>
      {status.toUpperCase()}
    </span>
  );
}
