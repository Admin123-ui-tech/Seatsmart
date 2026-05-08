import { getApiBaseUrl } from "@/lib/api";

const ADMIN_EMAIL_KEY = "seatsmart_admin_email";
const ADMIN_TOKEN_KEY = "seatsmart_admin_token";
const AUTH_REQUEST_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_ADMIN_AUTH_TIMEOUT_MS || 15000,
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

export function getAdminEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_EMAIL_KEY) || "";
}

export function getAdminToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_EMAIL_KEY);
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function loginAdmin(email, password) {
  const loginUrl = buildApiUrl("/api/admin/login");
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
        ? `Admin auth service timed out: ${loginUrl}`
        : `Unable to reach admin auth service: ${loginUrl}`
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ADMIN_EMAIL_KEY, payload?.admin?.email || String(email || "").trim().toLowerCase());
    if (payload?.sessionToken) {
      window.localStorage.setItem(ADMIN_TOKEN_KEY, payload.sessionToken);
    }
  }

  return payload;
}

export async function upsertAdminCredentials(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const rawPassword = String(password || "");
  const upsertUrl = buildApiUrl("/api/admin/credentials/upsert");
  let response;
  try {
    response = await fetchWithTimeout(upsertUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail,
        password: rawPassword,
      }),
    });
  } catch (error) {
    throw new Error(
      error?.name === "AbortError"
        ? `Admin credential service timed out: ${upsertUrl}`
        : `Unable to reach admin credential service: ${upsertUrl}`,
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }

  return payload;
}

export async function verifyAdminSession() {
  const token = getAdminToken();
  let response;
  try {
    response = await fetchWithTimeout(buildApiUrl("/api/admin/session"), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
  const token = getAdminToken();
  try {
    await fetch(buildApiUrl("/api/admin/logout"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } finally {
    clearAdminSession();
  }
}
