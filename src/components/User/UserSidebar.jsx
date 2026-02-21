// src/components/User/UserSidebar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  Calendar,
  BarChart2,
  Settings,
  Layers,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Image,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import useBrandKitStore from "../../stores/BrandKitStore";
import { BRAND_KIT_STATUS } from "../../constants/statusEnums";
import "../../styles/UserDashboard.css";

const SIDEBAR_COLLAPSE_KEY = "socialai-sidebar-collapsed";

const NAV_ITEMS = [
  {
    section: "Workspace",
    items: [
      { name: "Dashboard", path: "/app/dashboard", icon: LayoutDashboard },
      { name: "Generate", path: "/app/generate", icon: Sparkles, badge: "AI" },
      { name: "Library", path: "/app/library", icon: Image },
    ],
  },
  {
    section: "Publishing",
    items: [
      { name: "Calendar", path: "/app/calendar", icon: Calendar },
      { name: "Analytics", path: "/app/analytics", icon: BarChart2 },
    ],
  },
  {
    section: "Account",
    items: [
      { name: "Settings", path: "/app/settings", icon: Settings },
      { name: "Brand Kit", path: "/app/settings/brand-kit", icon: Layers, badge: "NEW" },
    ],
  },
];

export default function UserSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const brandKitStatus = useBrandKitStore((s) => s.status);
  const brandKitConfigured = brandKitStatus === BRAND_KIT_STATUS.CONFIGURED;
  const loadBrandKit = useBrandKitStore((s) => s.loadBrandKit);

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1";
  });
  const [profile, setProfile] = useState(null);

  // Persist collapsed state so sidebar behavior stays consistent across routes.
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      loadBrandKit(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, role")
        .eq("id", user.id)
        .single();

      if (mounted) {
        setProfile(data);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [loadBrandKit]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const initials = profile?.full_name
    ? profile.full_name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""}`} aria-label="Main navigation">
      <div className="sidebar-top-controls">
        <button
          className={`sidebar-toggle-btn ${collapsed ? "collapsed" : ""}`}
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          type="button"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="Your avatar" /> : initials}
        </div>

        {!collapsed && (
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{profile?.full_name ?? "Creator"}</span>
            <span className="sidebar-user-role">
              {profile?.role === "admin" ? "Admin" : "Creator"}
            </span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {NAV_ITEMS.map(({ section, items }) => (
          <div key={section}>
            {!collapsed && <span className="sidebar-section-label">{section}</span>}
            {collapsed && <div className="sidebar-section-gap" />}

            {items.map(({ name, path, icon: Icon, badge }) => (
              <button
                key={name}
                className={`sidebar-nav-item ${isActive(path) ? "active" : ""}`}
                onClick={() => navigate(path)}
                title={collapsed ? name : undefined}
                aria-current={isActive(path) ? "page" : undefined}
                type="button"
              >
                <span className="nav-icon">
                  <Icon size={17} aria-hidden="true" />
                </span>

                {!collapsed && (
                  <>
                    <span className="nav-label">{name}</span>
                    {name === "Brand Kit" && !brandKitConfigured && (
                      <span
                        className="nav-status-dot incomplete"
                        aria-label="Brand Kit not configured"
                        title="Complete your Brand Kit for better results"
                      />
                    )}
                    {badge && <span className="nav-badge">{badge}</span>}
                  </>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          aria-label="Sign out"
          type="button"
        >
          <span className="nav-icon">
            <LogOut size={17} aria-hidden="true" />
          </span>
          {!collapsed && <span className="nav-label">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
