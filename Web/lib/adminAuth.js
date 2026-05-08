import { getApiBaseUrl } from "@/lib/api";

const ADMIN_EMAIL_KEY = "seatsmart_admin_email";
const AUTH_REQUEST_TIMEOUT_MS = 5000;

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

export function getAdminEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_EMAIL_KEY) || "";
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_EMAIL_KEY);
}

export async function loginAdmin(email, password) {
  let response;
  try {
    response = await fetchWithTimeout(buildApiUrl("/api/admin/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    throw new Error(
      error?.name === "AbortError"
        ? "Admin auth service timed out. Please ensure API is running on NEXT_PUBLIC_API_URL."
        : "Unable to reach admin auth service. Please ensure API is running."
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ADMIN_EMAIL_KEY, payload?.admin?.email || String(email || "").trim().toLowerCase());
  }

  return payload;
}

export async function verifyAdminSession() {
  let response;
  try {
    response = await fetchWithTimeout(buildApiUrl("/api/admin/session"), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    clearAdminSession();
    return { authenticated: false };
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    clearAdminSession();
    return { authenticated: false };
  }

  return payload;
}

export async function logoutAdmin() {
  try {
    await fetch(buildApiUrl("/api/admin/logout"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    clearAdminSession();
  }
}
