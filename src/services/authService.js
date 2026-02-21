// src/services/authService.js
import { supabase } from "./supabaseClient";

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
 * 3) If neither, query `profiles` table for `role` column (your existing table)
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

    // 2) Try to read role from app_metadata / user_metadata
    // Supabase may expose these fields differently depending on how they were set.
    const appRole = user?.app_metadata?.role ?? null;
    const userRoleMeta = user?.user_metadata?.role ?? null;

    let role = appRole || userRoleMeta || null;
    let profile = null;

    // 3) If still no role, try the profiles table (your existing column)
    if (!role) {
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("role, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileErr && profileErr.code !== "PGRST116") {
        // Unexpected DB error (not just "no rows")
        console.warn("Failed to fetch profiles row:", profileErr.message);
      } else {
        profile = profileData ?? null;
        role = profileData?.role ?? null;
      }
    }

    // Normalize role to lowercase string if present
    if (typeof role === "string") role = role.toLowerCase();

    return { user, role, profile };
  } catch (err) {
    console.error("getUserProfileAndRole error:", err);
    return { user: null, role: null, profile: null };
  }
};
