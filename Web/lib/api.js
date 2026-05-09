const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const ADMIN_TOKEN_KEY = "seatsmart_admin_token";
const SUPER_ADMIN_TOKEN_KEY = "seatsmart_super_admin_token";

function getApiBaseUrl() {
  if (typeof window === "undefined") return API_BASE_URL;

  try {
    const configured = new URL(API_BASE_URL);
    const currentHost = window.location.hostname;

    const isDev = process.env.NODE_ENV !== "production";

    // Dev host alignment:
    // Only remap API host when API is configured as loopback (localhost/127.0.0.1/::1)
    // and the app is opened via LAN IP on another device.
    // Never rewrite a remote API host (e.g. Render) to localhost.
    if (isDev && configured.hostname !== currentHost) {
      const configuredIsLocal = LOCAL_HOSTS.has(configured.hostname);
      const currentIsLocal = LOCAL_HOSTS.has(currentHost);
      if (configuredIsLocal && !currentIsLocal) {
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
  let nextPath = path;

  if (typeof window !== "undefined") {
    const isSuperAdminRoute = window.location.pathname.startsWith("/super-admin");
    const isApiPath = String(nextPath || "").startsWith("/api/");
    const alreadySuperApi = String(nextPath || "").startsWith("/api/super-admin/");
    if (isSuperAdminRoute && isApiPath && !alreadySuperApi) {
      nextPath = `/api/super-admin${String(nextPath).slice(4)}`;
    }
  }

  const url = new URL(nextPath, getApiBaseUrl());
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function buildHeaders() {
  const headers = { "Content-Type": "application/json" };

  if (typeof window !== "undefined") {
    const isSuperAdminRoute = window.location.pathname.startsWith("/super-admin");
    const tokenKey = isSuperAdminRoute ? SUPER_ADMIN_TOKEN_KEY : ADMIN_TOKEN_KEY;
    const token = window.localStorage.getItem(tokenKey) || "";
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
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
