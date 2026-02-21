// src/layouts/AuthLayout.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../Context/ThemeContext";
import "../pages/Auth/Auth.css";

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      className="auth-theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      type="button"
    >
      {isDark ? (
        /* Sun icon - click to go light */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ) : (
        /* Moon icon - click to go dark */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-root">

      {/* ── LEFT BRAND PANEL (always dark) ── */}
      <aside className="auth-panel" aria-hidden="true">
        <div className="auth-panel-glow auth-panel-glow--a" />
        <div className="auth-panel-glow auth-panel-glow--b" />
        <div className="auth-panel-grid" />

        <div className="auth-panel-inner">
          <Link to="/" className="auth-panel-logo">
            <span className="auth-panel-logo-mark">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M11 2L20 7V15L11 20L2 15V7L11 2Z" fill="url(#apg1)"/>
                <circle cx="11" cy="11" r="3" fill="white" opacity="0.9"/>
                <defs>
                  <linearGradient id="apg1" x1="2" y1="2" x2="20" y2="20">
                    <stop stopColor="#818cf8"/><stop offset="1" stopColor="#6366f1"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
            SocialAI
          </Link>

          <div className="auth-panel-copy">
            <h2 className="auth-panel-h2">
              Your content.<br/>
              <span className="auth-panel-gradient">Automated.</span>
            </h2>
            <p className="auth-panel-sub">
              Generate, schedule, and publish across every platform —
              all from one intelligent workspace.
            </p>
          </div>

          <ul className="auth-panel-features">
            {[
              "AI captions, hashtags & visuals in seconds",
              "Smart scheduling at your audience's peak times",
              "Instagram, TikTok, LinkedIn, Facebook & YouTube",
              "Full pipeline — from draft to published",
            ].map((f) => (
              <li key={f}>
                <span className="auth-panel-check">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>

          <div className="auth-panel-testimonial">
            <p>"We cut content production time by 70%. SocialAI just gets our brand."</p>
            <div className="auth-panel-tauthor">
              <div className="auth-panel-tavatar">AO</div>
              <div>
                <strong>Amara Osei</strong>
                <span>Head of Marketing, Kojo Retail</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT FORM PANEL (themed) ── */}
      <main className="auth-form-side">

        {/* Top bar */}
        <div className="auth-topbar">
          <Link to="/" className="auth-back">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M9.5 3L5 7.5L9.5 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to home
          </Link>
          <ThemeToggle />
        </div>

        {/* Form card */}
        <div className="auth-form-wrap">
          {/* Mobile-only logo */}
          <Link to="/" className="auth-mobile-logo">
            <span className="auth-panel-logo-mark">
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <path d="M11 2L20 7V15L11 20L2 15V7L11 2Z" fill="url(#apg2)"/>
                <circle cx="11" cy="11" r="3" fill="white" opacity="0.9"/>
                <defs>
                  <linearGradient id="apg2" x1="2" y1="2" x2="20" y2="20">
                    <stop stopColor="#818cf8"/><stop offset="1" stopColor="#6366f1"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
            SocialAI
          </Link>

          <header className="auth-form-header">
            <h1 className="auth-form-title">{title}</h1>
            {subtitle && <p className="auth-form-subtitle">{subtitle}</p>}
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}