import { getApiBaseUrl } from "@/lib/api";

const SUPER_ADMIN_EMAIL_KEY = "seatsmart_super_admin_email";
const SUPER_ADMIN_TOKEN_KEY = "seatsmart_super_admin_token";
const AUTH_REQUEST_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_SUPER_ADMIN_AUTH_TIMEOUT_MS || 15000,
);

function buildApiUrl(path) {
  return new URL(path, getApiBaseUrl()).toString();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      credentials: "include",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getSuperAdminEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SUPER_ADMIN_EMAIL_KEY) || "";
}

export function getSuperAdminToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY) || "";
}

export function clearSuperAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SUPER_ADMIN_EMAIL_KEY);
  window.localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY);
}

export async function loginSuperAdmin(email, password) {
  const loginUrl = buildApiUrl("/api/super-admin/login");
  let response;
  try {
    response = await fetchWithTimeout(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    throw new Error(
      error?.name === "AbortError"
        ? `Super admin auth service timed out: ${loginUrl}`
        : `Unable to reach super admin auth service: ${loginUrl}`,
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      SUPER_ADMIN_EMAIL_KEY,
      payload?.superAdmin?.email || String(email || "").trim().toLowerCase(),
    );
    if (payload?.sessionToken) {
      window.localStorage.setItem(SUPER_ADMIN_TOKEN_KEY, payload.sessionToken);
    }
  }

  return payload;
}

export async function verifySuperAdminSession() {
  const token = getSuperAdminToken();
  let response;
  try {
    response = await fetchWithTimeout(buildApiUrl("/api/super-admin/session"), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    clearSuperAdminSession();
    return { authenticated: false };
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    clearSuperAdminSession();
    return { authenticated: false };
  }

  return payload;
}

export async function logoutSuperAdmin() {
  const token = getSuperAdminToken();
  try {
    await fetch(buildApiUrl("/api/super-admin/logout"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } finally {
    clearSuperAdminSession();
  }
}
