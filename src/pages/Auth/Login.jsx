// src/pages/Auth/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import AuthLayout from "../../layouts/AuthLayout";

// Google SVG icon — inline so no dependency needed
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M22 6L12 13 2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{flexShrink:0}}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState("");// "email" | "google" | ""

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading("email");
    try {
      await login(email, password);
      navigate("/app/dashboard");
    } catch {
      setError("Invalid email or password. Please check your details and try again.");
    } finally {
      setLoading("");
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading("google");
    try {
      await loginWithGoogle();
      // OAuth redirects — navigate called after redirect callback
    } catch {
      setError("Couldn't connect with Google. Please try again.");
      setLoading("");
    }
  };

  const busy = !!loading;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your SocialAI workspace."
    >
      {/* Google OAuth */}
      <button
        type="button"
        className="auth-oauth-btn"
        onClick={handleGoogle}
        disabled={busy}
      >
        {loading === "google" ? (
          <svg className="auth-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 56" strokeLinecap="round"/>
          </svg>
        ) : (
          <GoogleIcon />
        )}
        {loading === "google" ? "Connecting…" : "Sign in with Google"}
      </button>

      <div className="auth-divider"><span>or continue with email</span></div>

      {/* Error */}
      {error && (
        <div className="auth-error" role="alert">
          <AlertIcon />
          {error}
        </div>
      )}

      <form onSubmit={handleEmailSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">Email address</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><MailIcon /></span>
            <input
              id="login-email"
              type="email"
              className="auth-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={busy}
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="login-password">Password</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><LockIcon /></span>
            <input
              id="login-password"
              type="password"
              className="auth-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={busy}
            />
          </div>
        </div>

        <div className="auth-options">
          <label className="auth-remember">
            <input type="checkbox" /> Remember me
          </label>
          <a href="#" className="auth-link">Forgot password?</a>
        </div>

        <button type="submit" className="auth-submit" disabled={busy}>
          {loading === "email" ? (
            <>
              <svg className="auth-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="28 56" strokeLinecap="round"/>
              </svg>
              Signing in…
            </>
          ) : "Sign in"}
        </button>
      </form>

      <p className="auth-footer">
        Don't have an account?{" "}
        <Link to="/register" className="auth-link">Create one free</Link>
      </p>
    </AuthLayout>
  );
}