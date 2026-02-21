/**
 * @file SocialMediaTile.jsx
 * @description Displays a connected social media platform with key metrics and API status.
 */

import React from "react";
import "../../styles/AdminDashboard.css";

export default function SocialMediaTile({ account }) {
  const statusColors = {
    green: "#10B981",
    yellow: "#F59E0B",
    red: "#EF4444",
  };

  return (
    <div className="social-media-tile">
      <h4>{account.platform}</h4>
      <p>Followers: {account.followers_count || 0}</p>
      <p>Engagement: {account.engagement_rate || 0}%</p>
      <span
        className="api-status-dot"
        style={{ backgroundColor: statusColors[account.api_status] || "#9CA3AF" }}
      />
    </div>
  );
}

