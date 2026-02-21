import React from "react";
import "../../styles/AdminDashboard.css";

export default function KpiCard({ title, value, trend, trendUp, color }) {
  // 1. Safely check if trend is an array (for Chart) or a string (for Badge)
  const isChart = Array.isArray(trend);

  return (
    <div className="kpi-card" style={{ borderTop: `4px solid ${color || '#4f46e5'}` }}>
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        
        {/* 2. IF STRING: Render a simple text badge */}
        {!isChart && trend && (
          <span className={`kpi-badge ${trendUp ? 'positive' : 'negative'}`}>
            {trend}
          </span>
        )}
      </div>
      
      <div className="kpi-body">
        <h3 className="kpi-value">{value}</h3>
        
        {/* 3. IF ARRAY: Render the SparkLine */}
        {isChart && (
          <div className="kpi-sparkline">
             <SparkLine data={trend} color={color} />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper: Only renders if data is actually an array
function SparkLine({ data, color }) {
  // Double-check it's an array and has enough points
  if (!Array.isArray(data) || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '40px' }}>
      <polyline points={points} fill="none" stroke={color || '#888'} strokeWidth="2" />
    </svg>
  );
}