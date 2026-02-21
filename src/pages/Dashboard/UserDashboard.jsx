// src/pages/Dashboard/UserDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Calendar,
  BarChart3,
  Zap,
  FileImage,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Wifi,
  WifiOff,
  AlertCircle,
  Plus,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import UserNavbar from "../../components/User/UserNavbar";
import UserSidebar from "../../components/User/UserSidebar";
import "../../styles/UserDashboard.css";

const RECENT_GENERATION_LIMIT = 5;
const GENERATION_SEARCH_LIMIT = 120;

function getTitleFromPrompt(prompt) {
  if (!prompt || typeof prompt !== "string") return "Untitled Generation";
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Untitled Generation";
  const base = words.slice(0, 7).join(" ");
  return words.length > 7 ? `${base}...` : base;
}

function getGenerationTitle(generation) {
  const metadataTitle = generation?.metadata?.title;
  const sessionTitle = generation?.session_title;

  if (typeof metadataTitle === "string" && metadataTitle.trim()) {
    return metadataTitle.trim();
  }

  if (typeof sessionTitle === "string" && sessionTitle.trim()) {
    return sessionTitle.trim();
  }

  return getTitleFromPrompt(generation?.prompt);
}

function getGenerationSearchText(generation) {
  const title = getGenerationTitle(generation);
  const prompt = generation?.prompt ?? "";
  return `${title} ${prompt}`.toLowerCase();
}

function formatGenerationDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeConnectionStatus(status) {
  if (!status || typeof status !== "string") return "active";

  const normalized = status.toLowerCase();
  if (normalized === "active" || normalized === "mock") return "active";
  if (normalized === "expired") return "expired";
  if (normalized === "error" || normalized === "failed") return "error";
  if (normalized === "revoked" || normalized === "disconnected") return "disconnected";
  return "active";
}

function formatPlatformName(platform) {
  if (!platform || typeof platform !== "string") return "Platform";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function KpiCard({ index, title, value, icon: Icon, iconColor, iconBg, trend, loading }) {
  return (
    <div className={`kpi-card kpi-card--${index}`}>
      <div className="kpi-card-top">
        <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>
          <Icon size={18} aria-hidden="true" />
        </div>
        {trend && (
          <span className="kpi-trend-badge up">
            <ArrowUpRight size={12} /> {trend}
          </span>
        )}
      </div>

      {loading ? (
        <>
          <div className="kpi-shimmer" />
          <div className="kpi-shimmer-sm" />
        </>
      ) : (
        <>
          <p className="kpi-value">{value}</p>
          <p className="kpi-label">{title}</p>
        </>
      )}
    </div>
  );
}

function OnboardingChecklist({ hasConnectedAccount, hasGeneration }) {
  const navigate = useNavigate();

  const steps = [
    {
      id: "profile",
      label: "Create your account",
      done: true,
      path: "/app/settings",
    },
    {
      id: "connect",
      label: "Connect a social account",
      done: hasConnectedAccount,
      path: "/app/settings",
    },
    {
      id: "generate",
      label: "Generate your first post",
      done: hasGeneration,
      path: "/app/generate",
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const setupPercentage = Math.round((completed / steps.length) * 100);

  return (
    <div className="onboarding-card">
      <div className="onboarding-icon-wrap">
        <Sparkles size={26} />
      </div>
      <h2 className="onboarding-title">Welcome to SocialAI</h2>
      <p className="onboarding-sub">
        You are {setupPercentage}% set up. Complete these steps to start generating and
        publishing AI-powered content.
      </p>

      <div className="onboarding-steps">
        {steps.map((step) => (
          <button
            key={step.id}
            className={`onboarding-step ${step.done ? "done" : ""}`}
            onClick={() => !step.done && navigate(step.path)}
            disabled={step.done}
            style={{ cursor: step.done ? "default" : "pointer" }}
          >
            <span className="step-check">{step.done && <CheckCircle2 size={13} />}</span>
            <span className="step-text">{step.label}</span>
            {!step.done && <ChevronRight size={15} className="step-arrow" />}
          </button>
        ))}
      </div>

      <button className="onboarding-cta" onClick={() => navigate("/app/generate")}>
        <Sparkles size={16} />
        Generate your first post
      </button>
    </div>
  );
}

const PLATFORM_COLORS = {
  instagram: "#e1306c",
  facebook: "#1877f2",
  twitter: "#1da1f2",
  linkedin: "#0077b5",
  tiktok: "#010101",
  youtube: "#ff0000",
};

function PlatformChip({ platform }) {
  const platformKey = platform?.toLowerCase() ?? "other";
  const color = PLATFORM_COLORS[platformKey] ?? "#6366f1";
  const label = formatPlatformName(platformKey);

  return (
    <span className="activity-platform-chip" style={{ borderColor: `${color}44`, color }}>
      {label}
    </span>
  );
}

function HealthIcon({ status }) {
  if (status === "active") return <Wifi size={13} color="var(--dash-success)" />;
  if (status === "expired") return <AlertCircle size={13} color="var(--dash-warning)" />;
  if (status === "disconnected") return <WifiOff size={13} color="var(--dash-text-2)" />;
  return <WifiOff size={13} color="var(--dash-danger)" />;
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Creator");
  const [searchQuery, setSearchQuery] = useState("");
  const [generationIndex, setGenerationIndex] = useState([]);

  const [stats, setStats] = useState({
    totalGenerated: 0,
    scheduledPosts: 0,
    publishedPosts: 0,
    drafts: 0,
    creditsUsed: 0,
  });

  const [recentGenerations, setRecentGenerations] = useState([]);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Fetch all dashboard data and keep list data in sync.
  const fetchDashboardData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [
        profileResult,
        totalGenerationsResult,
        scheduledPostsResult,
        publishedPostsResult,
        draftsResult,
        recentGenerationsResult,
        generationIndexResult,
        connectedAccountsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("full_name, credits").eq("id", user.id).single(),
        supabase
          .from("generations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "scheduled"),
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "published"),
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "draft"),
        supabase
          .from("generations")
          .select("id, session_id, prompt, storage_path, media_type, status, created_at, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(RECENT_GENERATION_LIMIT),
        supabase
          .from("generations")
          .select("id, session_id, prompt, status, created_at, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(GENERATION_SEARCH_LIMIT),
        supabase
          .from("connected_accounts")
          .select("id, platform, account_name, connection_status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      if (profileResult.data?.full_name) {
        setUserName(profileResult.data.full_name.trim().split(" ")[0]);
      }

      const recentRows = recentGenerationsResult.data ?? [];
      const indexRows = generationIndexResult.data ?? [];
      const allSessionIds = [...recentRows, ...indexRows]
        .map((row) => row.session_id)
        .filter(Boolean);

      const uniqueSessionIds = [...new Set(allSessionIds)];
      const sessionTitleMap = new Map();

      if (uniqueSessionIds.length > 0) {
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id, title")
          .in("id", uniqueSessionIds);

        (sessions ?? []).forEach((session) => {
          sessionTitleMap.set(session.id, session.title ?? "");
        });
      }

      const withSessionTitle = (rows) =>
        rows.map((row) => ({
          ...row,
          session_title: row.session_id ? sessionTitleMap.get(row.session_id) ?? "" : "",
        }));

      const totalGenerations = totalGenerationsResult.count ?? 0;
      const connected = connectedAccountsResult.data ?? [];

      setStats({
        totalGenerated: totalGenerations,
        scheduledPosts: scheduledPostsResult.count ?? 0,
        publishedPosts: publishedPostsResult.count ?? 0,
        drafts: draftsResult.count ?? 0,
        creditsUsed: profileResult.data?.credits ?? 0,
      });

      setRecentGenerations(withSessionTitle(recentRows));
      setGenerationIndex(withSessionTitle(indexRows));
      setConnectedAccounts(connected);
      setIsFirstTime(totalGenerations === 0 && connected.length === 0);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "generations" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, fetchDashboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "connected_accounts" }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const hasConnectedAccount = connectedAccounts.length > 0;
  const hasGeneration = stats.totalGenerated > 0;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedSearchQuery) return [];

    return generationIndex
      .filter((generation) => getGenerationSearchText(generation).includes(normalizedSearchQuery))
      .slice(0, 8)
      .map((generation) => ({
        ...generation,
        title: getGenerationTitle(generation),
      }));
  }, [generationIndex, normalizedSearchQuery]);

  const filteredRecentGenerations = useMemo(() => {
    if (!normalizedSearchQuery) return recentGenerations;

    return recentGenerations.filter((generation) =>
      getGenerationSearchText(generation).includes(normalizedSearchQuery)
    );
  }, [recentGenerations, normalizedSearchQuery]);

  return (
    <div className="dashboard-shell">
      <UserNavbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchResults={searchResults}
        searchLoading={loading && normalizedSearchQuery.length > 0}
        onSearchSelect={(generation) => {
          navigate(`/app/generate?session=${generation.id}`);
        }}
      />

      <UserSidebar />

      <main className="dashboard-content" id="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-greeting">
              {greeting}, {userName}
            </h1>
            <p className="page-subtext">
              {isFirstTime
                ? "Let's get you set up and ready to create."
                : "Here is what is happening with your content today."}
            </p>
          </div>
          <button className="header-create-btn" onClick={() => navigate("/app/generate")}>
            <Plus size={16} aria-hidden="true" />
            New Content
          </button>
        </header>

        {isFirstTime && !loading && (
          <OnboardingChecklist
            hasConnectedAccount={hasConnectedAccount}
            hasGeneration={hasGeneration}
          />
        )}

        <section className="kpi-grid" aria-label="Key metrics">
          <KpiCard
            index={1}
            title="Total Generated"
            value={stats.totalGenerated}
            icon={FileImage}
            iconColor="#818cf8"
            iconBg="rgba(99,102,241,0.12)"
            trend="+12%"
            loading={loading}
          />
          <KpiCard
            index={2}
            title="Scheduled Posts"
            value={stats.scheduledPosts}
            icon={Calendar}
            iconColor="#eab308"
            iconBg="rgba(234,179,8,0.12)"
            loading={loading}
          />
          <KpiCard
            index={3}
            title="Published"
            value={stats.publishedPosts}
            icon={BarChart3}
            iconColor="#22c55e"
            iconBg="rgba(34,197,94,0.12)"
            loading={loading}
          />
          <KpiCard
            index={4}
            title="Credits Left"
            value={stats.creditsUsed}
            icon={Zap}
            iconColor="#ef4444"
            iconBg="rgba(239,68,68,0.12)"
            loading={loading}
          />
        </section>

        {!isFirstTime && (
          <div className="widget-row">
            <div className="widget-card">
              <div className="widget-header">
                <h2 className="widget-title">Recent Generations</h2>
                <button className="widget-link-btn" onClick={() => navigate("/app/library")}>
                  View all
                </button>
              </div>

              <div className="activity-list" role="list">
                {loading ? (
                  [1, 2, 3].map((item) => (
                    <div
                      key={item}
                      style={{
                        height: 64,
                        borderRadius: 10,
                        background: "var(--dash-panel-2)",
                        animation: "shimmer 1.4s ease infinite",
                        backgroundImage:
                          "linear-gradient(90deg, var(--dash-panel-2) 25%, var(--dash-panel-hover) 50%, var(--dash-panel-2) 75%)",
                        backgroundSize: "200% 100%",
                      }}
                    />
                  ))
                ) : filteredRecentGenerations.length === 0 ? (
                  <div className="empty-state">
                    <Sparkles size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                    {normalizedSearchQuery ? (
                      <p>No generations match your search.</p>
                    ) : (
                      <p>No content yet. Generate your first post.</p>
                    )}
                    <button
                      className="onboarding-cta"
                      style={{ marginTop: 12 }}
                      onClick={() => navigate("/app/generate")}
                    >
                      <Sparkles size={15} />
                      Generate now
                    </button>
                  </div>
                ) : (
                  filteredRecentGenerations.map((generation) => (
                    <button
                      key={generation.id}
                      type="button"
                      className="activity-item"
                      role="listitem"
                      onClick={() => navigate(`/app/generate?session=${generation.id}`)}
                    >
                      <div className="activity-thumb">
                        {generation.storage_path ? (
                          generation.media_type === "video" ? (
                            <video src={generation.storage_path} />
                          ) : (
                            <img src={generation.storage_path} alt="Generation preview" />
                          )
                        ) : (
                          <FileImage size={20} className="activity-thumb-placeholder" />
                        )}
                      </div>

                      <div className="activity-info">
                        <span className="activity-title">{getGenerationTitle(generation)}</span>
                        <div className="activity-meta">
                          <Clock size={11} aria-hidden="true" />
                          <span className="activity-time">
                            {formatGenerationDate(generation.created_at)}
                          </span>
                          {generation.metadata?.platform && (
                            <PlatformChip platform={generation.metadata.platform} />
                          )}
                        </div>
                      </div>

                      <span className={`status-chip ${generation.status ?? "draft"}`}>
                        {generation.status ?? "draft"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="widget-column">
              <div className="widget-card">
                <div className="widget-header">
                  <h2 className="widget-title">Quick Actions</h2>
                </div>

                {[
                  {
                    label: "Generate Content",
                    desc: "Create AI-powered posts",
                    icon: Sparkles,
                    bg: "rgba(99,102,241,0.12)",
                    color: "#818cf8",
                    path: "/app/generate",
                  },
                  {
                    label: "Schedule a Post",
                    desc: "Plan your publishing calendar",
                    icon: Calendar,
                    bg: "rgba(234,179,8,0.12)",
                    color: "#eab308",
                    path: "/app/calendar",
                  },
                  {
                    label: "View Analytics",
                    desc: "Track performance and growth",
                    icon: BarChart3,
                    bg: "rgba(34,197,94,0.12)",
                    color: "#22c55e",
                    path: "/app/analytics",
                  },
                ].map(({ label, desc, icon: Icon, bg, color, path }) => (
                  <button
                    key={label}
                    className="quick-action-item"
                    onClick={() => navigate(path)}
                    type="button"
                  >
                    <div className="qa-icon" style={{ background: bg, color }}>
                      <Icon size={17} aria-hidden="true" />
                    </div>
                    <div>
                      <span className="qa-label">{label}</span>
                      <span className="qa-desc">{desc}</span>
                    </div>
                    <ChevronRight size={15} className="qa-arrow" aria-hidden="true" />
                  </button>
                ))}
              </div>

              <div className="widget-card">
                <div className="widget-header">
                  <h2 className="widget-title">Account Health</h2>
                  <button className="widget-link-btn" onClick={() => navigate("/app/settings")}>
                    Manage
                  </button>
                </div>

                {connectedAccounts.length === 0 ? (
                  <div className="empty-state" style={{ padding: "20px 0" }}>
                    <WifiOff size={22} style={{ opacity: 0.3 }} />
                    <p>No accounts connected yet.</p>
                    <button
                      className="empty-state-link"
                      onClick={() => navigate("/app/settings")}
                      type="button"
                    >
                      Connect an account
                    </button>
                  </div>
                ) : (
                  <div className="account-health-grid">
                    {connectedAccounts.map((account) => {
                      const normalizedStatus = normalizeConnectionStatus(account.connection_status);

                      return (
                        <div key={account.id} className="account-health-card">
                          <span className="account-platform-name">
                            {formatPlatformName(account.platform)}
                          </span>
                          <span className="account-display-name">
                            {account.account_name || "Unnamed account"}
                          </span>
                          <span className={`account-status-pill ${normalizedStatus}`}>
                            <HealthIcon status={normalizedStatus} />
                            <span>
                              {normalizedStatus.charAt(0).toUpperCase() +
                                normalizedStatus.slice(1)}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

