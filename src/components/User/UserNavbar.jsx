// src/components/User/UserNavbar.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Plus, Search, X } from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import ProfileMenu from "./ProfileMenu";
import "../../styles/UserDashboard.css";

const NOTIFICATION_STORAGE_KEY = "socialai-notification-seen";

function getTitleFromPrompt(prompt) {
  if (!prompt || typeof prompt !== "string") return "Untitled Generation";
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Untitled Generation";
  const base = words.slice(0, 7).join(" ");
  return words.length > 7 ? `${base}...` : base;
}

function getGenerationTitle(generation) {
  const metadataTitle = generation?.metadata?.title;
  if (typeof metadataTitle === "string" && metadataTitle.trim()) {
    return metadataTitle.trim();
  }

  if (typeof generation?.title === "string" && generation.title.trim()) {
    return generation.title.trim();
  }

  return getTitleFromPrompt(generation?.prompt);
}

function formatNotificationTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSearchDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizePostAccountData(connectedAccount) {
  if (!connectedAccount) return { platform: "Platform", accountName: "Unknown account" };

  if (Array.isArray(connectedAccount)) {
    const first = connectedAccount[0] ?? {};
    return {
      platform: first.platform ?? "Platform",
      accountName: first.account_name ?? "Unknown account",
    };
  }

  return {
    platform: connectedAccount.platform ?? "Platform",
    accountName: connectedAccount.account_name ?? "Unknown account",
  };
}

export default function UserNavbar({
  searchQuery = "",
  onSearchQueryChange = () => {},
  searchResults = [],
  searchLoading = false,
  onSearchSelect = () => {},
}) {
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState(null);

  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const markNotificationsRead = useCallback((activeUserId) => {
    if (!activeUserId) return;
    localStorage.setItem(`${NOTIFICATION_STORAGE_KEY}-${activeUserId}`, new Date().toISOString());
    setUnreadCount(0);
  }, []);

  const fetchNotifications = useCallback(async (activeUserId) => {
    if (!activeUserId) return;

    const [generationsResult, postsResult, accountsResult] = await Promise.all([
      supabase
        .from("generations")
        .select("id, prompt, status, created_at, updated_at, metadata")
        .eq("user_id", activeUserId)
        .in("status", ["completed", "processing", "failed"])
        .order("updated_at", { ascending: false })
        .limit(15),
      supabase
        .from("posts")
        .select("id, status, account_id, created_at, scheduled_at, published_at")
        .eq("user_id", activeUserId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("connected_accounts")
        .select("id, platform, account_name")
        .eq("user_id", activeUserId),
    ]);

    if (generationsResult.error) {
      console.error("[UserNavbar] generation notifications query failed:", generationsResult.error.message);
    }
    if (postsResult.error) {
      console.error("[UserNavbar] post notifications query failed:", postsResult.error.message);
    }
    if (accountsResult.error) {
      console.error("[UserNavbar] account lookup query failed:", accountsResult.error.message);
    }

    const accountById = new Map((accountsResult.data ?? []).map((account) => [account.id, account]));

    const generationNotifications = (generationsResult.data ?? []).map((generation) => {
      const status = generation.status ?? "processing";
      const timestamp = generation.updated_at ?? generation.created_at;
      let headline = "Generation update";

      if (status === "completed") headline = "Generation completed";
      if (status === "processing") headline = "Generation started";
      if (status === "failed") headline = "Generation failed";

      return {
        id: `generation-${generation.id}`,
        timestamp,
        headline,
        detail: getGenerationTitle(generation),
        route: `/app/generate?session=${generation.id}`,
      };
    });

    const postNotifications = (postsResult.data ?? [])
      .filter((post) => {
        const normalized = (post.status ?? "").toLowerCase();
        return normalized === "published" || normalized === "scheduled" || normalized === "failed";
      })
      .slice(0, 15)
      .map((post) => {
        const status = (post.status ?? "scheduled").toLowerCase();
        const timestamp = post.published_at ?? post.scheduled_at ?? post.created_at;
        const accountId = post.account_id;
        const account = normalizePostAccountData(accountById.get(accountId));
        let headline = "Post update";

        if (status === "published") headline = "Post published";
        if (status === "scheduled") headline = "Post scheduled";
        if (status === "failed") headline = "Post publishing failed";

        return {
          id: `post-${post.id}`,
          timestamp,
          headline,
          detail: `${account.platform} - ${account.accountName}`,
          route: "/app/calendar",
        };
      });

    const merged = [...generationNotifications, ...postNotifications]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    const seenAtRaw = localStorage.getItem(`${NOTIFICATION_STORAGE_KEY}-${activeUserId}`);
    const seenAt = seenAtRaw ? new Date(seenAtRaw).getTime() : 0;

    const unread = merged.filter((item) => {
      const itemTime = new Date(item.timestamp).getTime();
      return itemTime > seenAt;
    }).length;

    setNotifications(merged);
    setUnreadCount(unread);
  }, []);

  // Load profile and initialize notification data.
  useEffect(() => {
    let mounted = true;

    async function initializeNavbarData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;
      setUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, credits")
        .eq("id", user.id)
        .single();

      if (!mounted) return;
      setProfile({ ...profileData, email: user.email });
      await fetchNotifications(user.id);
    }

    initializeNavbarData();

    return () => {
      mounted = false;
    };
  }, [fetchNotifications]);

  // Keep notifications updated in realtime.
  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`navbar-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generations",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications(userId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  // Close popovers when clicking outside their containers.
  useEffect(() => {
    function handleClickOutside(event) {
      const target = event.target;

      if (profileOpen && profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }

      if (
        notificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }

      if (searchOpen && searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen, notificationsOpen, searchOpen]);

  // Support Ctrl/Cmd + K to focus the search input.
  useEffect(() => {
    function handleShortcut(event) {
      const isCommandOrCtrl = event.metaKey || event.ctrlKey;
      if (!isCommandOrCtrl) return;
      if (event.key.toLowerCase() !== "k") return;

      event.preventDefault();
      searchInputRef.current?.focus();
      setSearchOpen(true);
    }

    document.addEventListener("keydown", handleShortcut);
    return () => {
      document.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  const initials = profile?.full_name
    ? profile.full_name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const hasSearchValue = searchQuery.trim().length > 0;
  const showSearchMenu = searchOpen && hasSearchValue;

  return (
    <header className="app-navbar">
      <div className="navbar-brand">
        <a
          href="/app/dashboard"
          className="navbar-logo"
          onClick={(event) => {
            event.preventDefault();
            navigate("/app/dashboard");
          }}
        >
          <span className="navbar-logo-mark">
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L20 7V15L11 20L2 15V7L11 2Z" fill="url(#nb-g1)" />
              <circle cx="11" cy="11" r="3" fill="white" opacity="0.9" />
              <defs>
                <linearGradient id="nb-g1" x1="2" y1="2" x2="20" y2="20">
                  <stop stopColor="#818cf8" />
                  <stop offset="1" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="navbar-logo-text">SocialAI</span>
        </a>
      </div>

      <div className="navbar-search-wrap" ref={searchRef}>
        <Search size={14} className="navbar-search-icon" aria-hidden="true" />

        <input
          ref={searchInputRef}
          type="search"
          className="navbar-search-input"
          placeholder="Search generations by title or prompt"
          aria-label="Search generations"
          value={searchQuery}
          onChange={(event) => {
            onSearchQueryChange(event.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSearchOpen(false);
              return;
            }

            if (event.key === "Enter" && searchResults.length > 0) {
              event.preventDefault();
              onSearchSelect(searchResults[0]);
              onSearchQueryChange("");
              setSearchOpen(false);
            }
          }}
        />

        {hasSearchValue ? (
          <button
            type="button"
            className="navbar-search-clear"
            onClick={() => {
              onSearchQueryChange("");
              setSearchOpen(false);
              searchInputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        ) : (
          <kbd className="navbar-search-kbd">Ctrl+K</kbd>
        )}

        {showSearchMenu && (
          <div className="navbar-search-menu" role="listbox" aria-label="Search results">
            {searchLoading ? (
              <div className="navbar-search-empty">Loading results...</div>
            ) : searchResults.length === 0 ? (
              <div className="navbar-search-empty">No matching generations found.</div>
            ) : (
              searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="navbar-search-result"
                  onClick={() => {
                    onSearchSelect(result);
                    onSearchQueryChange("");
                    setSearchOpen(false);
                  }}
                >
                  <span className="navbar-search-result-title">{result.title}</span>
                  <span className="navbar-search-result-meta">
                    {formatSearchDate(result.created_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="navbar-actions">
        <button
          className="navbar-create-btn"
          onClick={() => navigate("/app/generate")}
          aria-label="Create new content"
          type="button"
        >
          <Plus size={15} aria-hidden="true" />
          <span>Create</span>
        </button>

        <div className="navbar-notification-wrap" ref={notificationsRef}>
          <button
            className={`navbar-icon-btn ${unreadCount > 0 ? "unread" : ""}`}
            aria-label="View notifications"
            type="button"
            onClick={() => {
              const next = !notificationsOpen;
              setNotificationsOpen(next);
              if (next && userId) {
                markNotificationsRead(userId);
              }
            }}
          >
            <Bell size={17} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="navbar-notif-dot" aria-hidden="true">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="navbar-notif-menu" role="menu" aria-label="Notifications">
              <div className="navbar-notif-header">Recent updates</div>

              {notifications.length === 0 ? (
                <div className="navbar-notif-empty">No notifications yet.</div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className="navbar-notif-item"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate(notification.route);
                    }}
                  >
                    <span className="navbar-notif-title">{notification.headline}</span>
                    <span className="navbar-notif-detail">{notification.detail}</span>
                    <span className="navbar-notif-time">
                      {formatNotificationTime(notification.timestamp)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="navbar-profile-wrap" ref={profileRef}>
          <button
            className={`navbar-avatar-btn ${profileOpen ? "open" : ""}`}
            onClick={() => setProfileOpen((value) => !value)}
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            type="button"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Your avatar" className="navbar-avatar-img" />
            ) : (
              <span className="navbar-avatar-initials" aria-hidden="true">
                {initials}
              </span>
            )}
            <span className="navbar-avatar-status" aria-hidden="true" />
          </button>

          {profileOpen && (
            <ProfileMenu
              profile={profile}
              initials={initials}
              onClose={() => setProfileOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
