export const APP_ROOT_PATH = "/app";
export const USER_HOME_PATH = "/app/dashboard";
export const ADMIN_HOME_PATH = "/app/admin";

const ADMIN_ROLE_TOKENS = new Set([
  "admin",
  "administrator",
  "superadmin",
  "super_admin",
  "owner",
  "root",
  "true",
  "1",
  "yes",
  "y",
]);

const USER_ROLE_TOKENS = new Set([
  "user",
  "creator",
  "member",
  "client",
  "false",
  "0",
  "no",
  "n",
]);

function toNormalizedToken(value) {
  if (value === null || value === undefined) return null;
  return String(value).trim().toLowerCase();
}

export function normalizeRole(rawValue) {
  if (Array.isArray(rawValue)) {
    for (const value of rawValue) {
      const normalized = normalizeRole(value);
      if (normalized === "admin") return "admin";
      if (normalized === "user") return "user";
    }
    return null;
  }

  if (typeof rawValue === "boolean") {
    return rawValue ? "admin" : "user";
  }

  const token = toNormalizedToken(rawValue);
  if (!token) return null;
  if (ADMIN_ROLE_TOKENS.has(token)) return "admin";
  if (USER_ROLE_TOKENS.has(token)) return "user";
  return null;
}

export function resolveRole({
  metadataRole = null,
  metadataIsAdmin = null,
  profileRole = null,
  profileIsAdmin = null,
} = {}) {
  const candidates = [metadataRole, metadataIsAdmin, profileRole, profileIsAdmin];

  if (candidates.some((value) => normalizeRole(value) === "admin")) {
    return "admin";
  }

  if (candidates.some((value) => normalizeRole(value) === "user")) {
    return "user";
  }

  return null;
}

function isSafeAppPath(path) {
  return typeof path === "string" && path.startsWith("/app");
}

function isAdminPath(path) {
  return path === ADMIN_HOME_PATH || path.startsWith(`${ADMIN_HOME_PATH}/`);
}

function sanitizeIntendedPath(path) {
  if (!isSafeAppPath(path)) return null;
  if (path === APP_ROOT_PATH) return null;
  return path;
}

export function getDefaultPathForRole(role) {
  return normalizeRole(role) === "admin" ? ADMIN_HOME_PATH : USER_HOME_PATH;
}

export function resolvePostAuthPath({ role, intendedPath = null } = {}) {
  const normalizedRole = normalizeRole(role);
  const safeIntendedPath = sanitizeIntendedPath(intendedPath);

  if (safeIntendedPath) {
    if (isAdminPath(safeIntendedPath) && normalizedRole !== "admin") {
      return USER_HOME_PATH;
    }
    return safeIntendedPath;
  }

  return getDefaultPathForRole(normalizedRole);
}
