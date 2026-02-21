/**
 * ScoreCard.jsx
 * Small KPI card with large value, colored delta and mini sparkline (svg).
 * Props:
 *  - title, value, deltaPercent (number), sparkData (array of numbers), color (string)
 */

import React from "react";
import "../../styles/AdminDashboard.css"; // small styles for layout

export default function ScoreCard({ title, value, deltaPercent, sparkData = [], color = "#10B981" }) {
  // Simple inline sparkline SVG (no external libs) — renders small polyline.
  const width = 100, height = 28;
  const max = Math.max(...sparkData, 1);
  const points = sparkData.map((v, i) => {
    const x = (i / Math.max(sparkData.length - 1, 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(" ");

  const deltaIsPositive = deltaPercent >= 0;

  return (
    <div className="scorecard">
      <div className="scorecard-head">
        <div className="scorecard-title">{title}</div>
        <div className="scorecard-delta" style={{ color: deltaIsPositive ? "#10B981" : "#ef4444" }}>
          {deltaIsPositive ? `+${deltaPercent}%` : `${deltaPercent}%`}
        </div>
      </div>

      <div className="scorecard-value">{typeof value === "number" && !Number.isInteger(value) ? value.toFixed(2) : value}</div>

      <div className="scorecard-spark">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
