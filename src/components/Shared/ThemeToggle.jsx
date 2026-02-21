import React from "react";
import { useTheme } from "../../Context/ThemeContext"; 
import { Sun, Moon } from "lucide-react"; 

export default function ThemeToggle() {
  const { dark, setDark } = useTheme();

  return (
    <button 
      onClick={() => setDark(!dark)} 
      className="theme-toggle-btn"
      style={{
        background: "transparent",
        border: "1px solid var(--border-color)",
        color: "var(--text-muted)",
        padding: "8px",
        borderRadius: "8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        transition: "all 0.2s"
      }}
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}