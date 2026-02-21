// src/services/authService.js
import { supabase } from "./supabaseClient";
import { resolveRole } from "../utils/authRouting";

/**
 * Sign in a user with email + password (throws on error)
 */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data; // contains session info
};

/**
 * Sign out
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return true;
};

/**
 * Get current supabase-auth user (or null)
 */
export const getCurrentAuthUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user ?? null;
};

/**
 * Return user's role and profile (reliable).
 *
 * Strategy:
 * 1) Read `app_metadata.role` (most authoritative if admin created via dashboard)
 * 2) Fall back to `user_metadata.role` (if you set role on signUp using user metadata)
 * 3) Merge with `profiles.role` and `profiles.is_admin` (if available)
 *
 * Returns: { user, role, profile } where role is 'admin'|'user'|null
 */
export const getUserProfileAndRole = async () => {
  try {
    // 1) Get auth user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.warn("auth.getUser error:", userErr.message);
      return { user: null, role: null, profile: null };
    }
    const user = userData?.user ?? null;
    if (!user) return { user: null, role: null, profile: null };

    // 2) Read role hints from auth metadata first.
    const appRole =
      user?.app_metadata?.role ??
      user?.app_metadata?.roles ??
      user?.app_metadata?.user_role ??
      null;
    const userRoleMeta =
      user?.user_metadata?.role ??
      user?.user_metadata?.roles ??
      user?.user_metadata?.user_role ??
      null;
    const appIsAdmin = user?.app_metadata?.is_admin ?? user?.app_metadata?.isAdmin ?? null;
    const userIsAdmin = user?.user_metadata?.is_admin ?? user?.user_metadata?.isAdmin ?? null;

    let role = resolveRole({
      metadataRole: [appRole, userRoleMeta],
      metadataIsAdmin: [appIsAdmin, userIsAdmin],
    });
    let profile = null;

    // 3) Read profile role markers and merge with metadata role hints.
    const profileQuery = await supabase
      .from("profiles")
      .select("role, is_admin, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    let profileData = profileQuery.data;
    let profileErr = profileQuery.error;

    // Backward compatibility: if `is_admin` column is unavailable, retry without it.
    if (profileErr && /is_admin/i.test(profileErr.message || "")) {
      const retryQuery = await supabase
        .from("profiles")
        .select("role, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      profileData = retryQuery.data;
      profileErr = retryQuery.error;
    }

    if (profileErr && profileErr.code !== "PGRST116") {
      // Unexpected DB error (not just "no rows")
      console.warn("Failed to fetch profiles row:", profileErr.message);
    } else {
      profile = profileData ?? null;
      role = resolveRole({
        metadataRole: [appRole, userRoleMeta],
        metadataIsAdmin: [appIsAdmin, userIsAdmin],
        profileRole: profileData?.role ?? null,
        profileIsAdmin: profileData?.is_admin ?? null,
      });
    }

    return { user, role, profile };
  } catch (err) {
    console.error("getUserProfileAndRole error:", err);
    return { user: null, role: null, profile: null };
  }
};
