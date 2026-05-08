const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function getApiBaseUrl() {
  if (typeof window === "undefined") return API_BASE_URL;

  try {
    const configured = new URL(API_BASE_URL);
    const currentHost = window.location.hostname;

    const isDev = process.env.NODE_ENV !== "production";

    // Dev host alignment:
    // Keep API host same as current web host when switching between localhost and LAN IP,
    // so auth cookies stay same-site and admin session works consistently.
    if (isDev && configured.hostname !== currentHost) {
      const configuredIsLocal = LOCAL_HOSTS.has(configured.hostname);
      const currentIsLocal = LOCAL_HOSTS.has(currentHost);
      if (configuredIsLocal !== currentIsLocal) {
        configured.hostname = currentHost;
        return configured.toString();
      }
    }

    return configured.toString();
  } catch {
    return API_BASE_URL;
  }
}

function buildUrl(path, query = {}) {
  const url = new URL(path, getApiBaseUrl());
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function buildHeaders() {
  return { "Content-Type": "application/json" };
}

async function request(path, options = {}, query) {
  const response = await fetch(buildUrl(path, query), {
    ...options,
    credentials: "include",
    headers: {
      ...buildHeaders(),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }
  return payload;
}

export async function apiGet(path, query, options = {}) {
  return request(path, { method: "GET", ...(options || {}) }, query);
}

export async function apiPost(path, body) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
}

export async function apiPut(path, body) {
  return request(path, {
    method: "PUT",
    body: JSON.stringify(body || {}),
  });
}

export { API_BASE_URL, getApiBaseUrl };
