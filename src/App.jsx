// src/App.jsx
import React from "react";
import { Outlet } from "react-router-dom";

// FIX: Use Capital 'A' to match the actual file name "App.css"
import "./styles/App.css"; 

export default function App() {
  return (
    <div className="app-shell">
      {/* FIX: Removed the stray comma after Outlet */}
      <Outlet />
    </div>
  );
}