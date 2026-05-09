const fs = require("fs");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

function loadEnvFile() {
  const candidatePaths = [
    path.join(process.cwd(), ".env"),
    path.resolve(__dirname, "..", ".env"),
    path.resolve(__dirname, "..", "..", ".env"),
  ];

  for (const envPath of candidatePaths) {
    if (!fs.existsSync(envPath)) continue;

    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnvFile();

const port = Number(process.env.PORT || 4000);
const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL (or DIRECT_URL) in API environment.");
}

const requiresSsl =
  !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
});

const allowedOrigins = String(process.env.API_ALLOWED_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const frontendUrl = safeText(process.env.FRONTEND_URL);
const frontendUrls = frontendUrl
  ? frontendUrl
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  : [];
const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...frontendUrls,
  safeText(process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_URL),
].filter(Boolean);
const corsAllowedOrigins = Array.from(
  new Set([
    ...(allowedOrigins.length ? allowedOrigins : defaultAllowedOrigins),
    ...frontendUrls,
  ]),
);
const supabaseUrl = safeText(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
).replace(/\/+$/, "");
const supabaseAnonKey = safeText(
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const supabaseServiceRoleKey = safeText(process.env.SUPABASE_SERVICE_ROLE_KEY);

const CORS_BASE_HEADERS = {
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  Vary: "Origin",
};

const RECENT_ACTIVITY = [
  "CSV uploaded",
  "Seating plan generated",
  "QR codes created",
  "Student portal activated",
];

const adminEmail = String(process.env.ADMIN_EMAIL || "")
  .trim()
  .toLowerCase();
const adminPassword = String(process.env.ADMIN_PASSWORD || "");
const superAdminEmail = String(process.env.SUPER_ADMIN_EMAIL || "")
  .trim()
  .toLowerCase();
const superAdminPassword = String(process.env.SUPER_ADMIN_PASSWORD || "");
const ADMIN_SETTINGS_EMAIL_KEY = "admin_email";
const ADMIN_SETTINGS_PASSWORD_KEY = "admin_password";
const ADMIN_CREDENTIALS_PRIMARY_KEY = "primary";
const adminSessionSecret =
  String(process.env.ADMIN_SESSION_SECRET || "").trim() ||
  `${adminEmail}:${adminPassword}`;
const superAdminSessionSecret =
  String(process.env.SUPER_ADMIN_SESSION_SECRET || "").trim() ||
  `${superAdminEmail}:${superAdminPassword}`;
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SUPER_ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const ADMIN_COOKIE_NAME = "seatsmart_admin_session";
const SUPER_ADMIN_COOKIE_NAME = "seatsmart_super_admin_session";
const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const adminCookieSameSite = (() => {
  const raw = safeText(process.env.ADMIN_COOKIE_SAMESITE).toLowerCase();
  if (raw === "none" || raw === "lax" || raw === "strict") {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return isProduction ? "None" : "Lax";
})();
const ADMIN_LOGIN_RATE_LIMIT_MAX = Math.max(
  1,
  Number(process.env.ADMIN_LOGIN_RATE_LIMIT_MAX || 20),
);
const STUDENT_SEAT_RATE_LIMIT_MAX = Math.max(
  1,
  Number(process.env.STUDENT_SEAT_RATE_LIMIT_MAX || 60),
);
const STUDENT_PROFILE_UPSERT_RATE_LIMIT_MAX = Math.max(
  1,
  Number(process.env.STUDENT_PROFILE_UPSERT_RATE_LIMIT_MAX || 20),
);
const STUDENT_PASSWORD_RESET_RATE_LIMIT_MAX = Math.max(
  1,
  Number(process.env.STUDENT_PASSWORD_RESET_RATE_LIMIT_MAX || 10),
);
const rateLimitStore = new Map();
let collegesColumnsPromise = null;
let examCentersColumnsPromise = null;
let roomsColumnsPromise = null;

function buildCorsHeaders(req) {
  const origin = safeText(req?.headers?.origin);
  const hasAllowedOrigins = corsAllowedOrigins.length > 0;
  const isAllowedOrigin =
    !hasAllowedOrigins || (origin && corsAllowedOrigins.includes(origin));
  const allowOrigin = origin && isAllowedOrigin ? origin : hasAllowedOrigins ? corsAllowedOrigins[0] : "*";

  const headers = {
    ...CORS_BASE_HEADERS,
    "Access-Control-Allow-Origin": allowOrigin,
  };

  if (allowOrigin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

function json(res, code, payload, extraHeaders = {}) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    ...buildCorsHeaders(res.req),
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function text(res, code, message, extraHeaders = {}) {
  res.writeHead(code, {
    "Content-Type": "text/plain",
    ...buildCorsHeaders(res.req),
    ...extraHeaders,
  });
  res.end(message);
}

function safeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return safeText(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeText(value));
}

function toIntOrNull(value) {
  if (value === undefined || value === null || safeText(value) === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function toIntOrZero(value) {
  const parsed = toIntOrNull(value);
  return parsed === null ? 0 : parsed;
}

function normalizeStatus(value, fallback = "active") {
  const normalized = safeText(value || fallback).toLowerCase();
  if (normalized !== "active" && normalized !== "inactive") return fallback;
  return normalized;
}

function normalizeType(value, fallback = "school") {
  const normalized = safeText(value || fallback).toLowerCase();
  if (normalized !== "school" && normalized !== "college") return fallback;
  return normalized;
}

function normalizeUuid(value) {
  const id = safeText(value);
  return id || null;
}

async function getCollegesColumns() {
  if (!collegesColumnsPromise) {
    collegesColumnsPromise = pool
      .query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'colleges'`,
      )
      .then((result) =>
        new Set(
          (result.rows || []).map((row) =>
            safeText(row.column_name).toLowerCase(),
          ),
        ),
      )
      .catch((error) => {
        collegesColumnsPromise = null;
        throw error;
      });
  }
  return collegesColumnsPromise;
}

async function getExamCentersColumns() {
  if (!examCentersColumnsPromise) {
    examCentersColumnsPromise = pool
      .query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'exam_centers'`,
      )
      .then((result) =>
        new Set(
          (result.rows || []).map((row) =>
            safeText(row.column_name).toLowerCase(),
          ),
        ),
      )
      .catch((error) => {
        examCentersColumnsPromise = null;
        throw error;
      });
  }
  return examCentersColumnsPromise;
}

async function getRoomsColumns() {
  if (!roomsColumnsPromise) {
    roomsColumnsPromise = pool
      .query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'rooms'`,
      )
      .then((result) =>
        new Set(
          (result.rows || []).map((row) =>
            safeText(row.column_name).toLowerCase(),
          ),
        ),
      )
      .catch((error) => {
        roomsColumnsPromise = null;
        throw error;
      });
  }
  return roomsColumnsPromise;
}

function mapDatabaseError(error, fallbackMessage) {
  const code = safeText(error?.code);
  const constraint = safeText(error?.constraint).toLowerCase();
  const column = safeText(error?.column);

  if (code === "23505") {
    if (constraint.includes("code")) {
      return {
        status: 409,
        message: "Code already exists. Please use a unique code.",
      };
    }
    return {
      status: 409,
      message: "Duplicate value found. Please check and try again.",
    };
  }

  if (code === "23502") {
    const field = column ? column.replace(/_/g, " ") : "required field";
    return {
      status: 400,
      message: `${field} is required.`,
    };
  }

  if (code === "23503") {
    return {
      status: 400,
      message: "This record is linked to missing or invalid related data.",
    };
  }

  if (code === "22P02") {
    return {
      status: 400,
      message: "Invalid input format.",
    };
  }

  return {
    status: 500,
    message: fallbackMessage || "Internal server error.",
  };
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function hasAdminCredentials(credentials) {
  return (
    !!normalizeEmail(credentials?.email) &&
    !!String(credentials?.password || "")
  );
}

function hasSuperAdminCredentials() {
  return !!superAdminEmail && !!superAdminPassword;
}

async function getAdminCredentialsFromAdminTable() {
  const result = await pool.query(
    `SELECT email, password
     FROM admin_credentials
     WHERE key = $1
     LIMIT 1`,
    [ADMIN_CREDENTIALS_PRIMARY_KEY],
  );

  const row = result.rows?.[0];
  if (!row) return null;

  const dbEmail = normalizeEmail(row.email);
  const dbPassword = String(row.password || "");

  if (!dbEmail || !dbPassword) return null;

  return {
    email: dbEmail,
    password: dbPassword,
    source: "admin_credentials",
  };
}

async function getAdminCredentialsFromSettings() {
  const result = await pool.query(
    `SELECT key, value
     FROM settings
     WHERE key = ANY($1::text[])`,
    [[ADMIN_SETTINGS_EMAIL_KEY, ADMIN_SETTINGS_PASSWORD_KEY]],
  );

  const map = {};
  for (const row of result.rows || []) {
    map[safeText(row.key)] = row.value;
  }

  const dbEmail = normalizeEmail(map[ADMIN_SETTINGS_EMAIL_KEY]);
  const dbPassword = String(map[ADMIN_SETTINGS_PASSWORD_KEY] || "");

  if (!dbEmail || !dbPassword) return null;

  return {
    email: dbEmail,
    password: dbPassword,
    source: "settings",
  };
}

async function getAdminCredentials() {
  const fallback = {
    email: adminEmail,
    password: adminPassword,
    source: "environment",
  };

  try {
    const adminTableCredentials = await getAdminCredentialsFromAdminTable();
    if (adminTableCredentials) return adminTableCredentials;

    const settingsCredentials = await getAdminCredentialsFromSettings();
    if (settingsCredentials) return settingsCredentials;
  } catch (error) {
    console.warn("Unable to read admin credentials from database:", {
      message: error?.message || "Unknown error",
    });
  }

  return fallback;
}

function getBearerToken(req) {
  const raw = safeText(req.headers.authorization);
  if (!raw.toLowerCase().startsWith("bearer ")) return "";
  return raw.slice(7).trim();
}

function parseCookies(req) {
  const raw = safeText(req.headers.cookie);
  const out = {};
  if (!raw) return out;

  for (const part of raw.split(";")) {
    const [key, ...rest] = part.split("=");
    const name = safeText(key);
    if (!name) continue;
    out[name] = decodeURIComponent(rest.join("=") || "");
  }
  return out;
}

function getAdminCookieToken(req) {
  const cookies = parseCookies(req);
  return safeText(cookies[ADMIN_COOKIE_NAME]);
}

function getSuperAdminCookieToken(req) {
  const cookies = parseCookies(req);
  return safeText(cookies[SUPER_ADMIN_COOKIE_NAME]);
}

function signToken(value) {
  return crypto
    .createHmac("sha256", adminSessionSecret)
    .update(value)
    .digest("base64url");
}

function signSuperAdminToken(value) {
  return crypto
    .createHmac("sha256", superAdminSessionSecret)
    .update(value)
    .digest("base64url");
}

function createAdminSession(email) {
  const payload = {
    email: normalizeEmail(email),
    createdAt: Date.now(),
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signToken(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function createSuperAdminSession(email) {
  const payload = {
    email: normalizeEmail(email),
    createdAt: Date.now(),
    expiresAt: Date.now() + SUPER_ADMIN_SESSION_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signSuperAdminToken(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function readAdminSession(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signToken(encodedPayload);
  if (signature !== expectedSignature) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!payload?.email || !payload?.expiresAt || !payload?.createdAt) return null;

  if (Date.now() > Number(payload.expiresAt)) {
    return null;
  }

  return {
    email: normalizeEmail(payload.email),
    createdAt: Number(payload.createdAt),
  };
}

function readSuperAdminSession(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signSuperAdminToken(encodedPayload);
  if (signature !== expectedSignature) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!payload?.email || !payload?.expiresAt || !payload?.createdAt) return null;
  if (Date.now() > Number(payload.expiresAt)) return null;

  return {
    email: normalizeEmail(payload.email),
    createdAt: Number(payload.createdAt),
  };
}

function deleteAdminSession(token) {
  return !!token;
}

function buildAdminCookie(token, expiresInMs = ADMIN_SESSION_TTL_MS) {
  const maxAgeSeconds = Math.max(0, Math.floor(expiresInMs / 1000));
  const secure = isProduction || adminCookieSameSite === "None" ? "; Secure" : "";
  return `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${adminCookieSameSite}; Max-Age=${maxAgeSeconds}${secure}`;
}

function buildSuperAdminCookie(token, expiresInMs = SUPER_ADMIN_SESSION_TTL_MS) {
  const maxAgeSeconds = Math.max(0, Math.floor(expiresInMs / 1000));
  const secure = isProduction || adminCookieSameSite === "None" ? "; Secure" : "";
  return `${SUPER_ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${adminCookieSameSite}; Max-Age=${maxAgeSeconds}${secure}`;
}

function buildExpiredAdminCookie() {
  const secure = isProduction || adminCookieSameSite === "None" ? "; Secure" : "";
  return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=${adminCookieSameSite}; Max-Age=0${secure}`;
}

function buildExpiredSuperAdminCookie() {
  const secure = isProduction || adminCookieSameSite === "None" ? "; Secure" : "";
  return `${SUPER_ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=${adminCookieSameSite}; Max-Age=0${secure}`;
}

function isOriginAllowed(req) {
  const origin = safeText(req.headers.origin);
  if (!origin) return true;
  if (corsAllowedOrigins.length === 0) return true;
  return corsAllowedOrigins.includes(origin);
}

function requireAdminSession(req, res) {
  const token = getBearerToken(req) || getAdminCookieToken(req);
  const session = readAdminSession(token);
  if (!session) {
    json(res, 401, { error: "Admin authentication required." });
    return null;
  }
  return session;
}

function requireSuperAdminSession(req, res) {
  const token = getBearerToken(req) || getSuperAdminCookieToken(req);
  const session = readSuperAdminSession(token);
  if (!session) {
    json(res, 401, { error: "Super admin authentication required." });
    return null;
  }
  return session;
}

function requireAdminOrSuperAdminSession(req, res) {
  const bearer = getBearerToken(req);
  const adminToken = bearer || getAdminCookieToken(req);
  const superAdminToken = bearer || getSuperAdminCookieToken(req);

  const adminSession = readAdminSession(adminToken);
  if (adminSession) {
    return { role: "admin", email: adminSession.email };
  }

  const superSession = readSuperAdminSession(superAdminToken);
  if (superSession) {
    return { role: "super_admin", email: superSession.email };
  }

  json(res, 401, { error: "Admin authentication required." });
  return null;
}

async function fetchSupabaseUser(accessToken) {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return null;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function requireStudentSession(req, res) {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    json(res, 401, { error: "Student authentication required." });
    return null;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    json(res, 500, {
      error: "Student auth service is not configured on API server.",
    });
    return null;
  }

  const user = await fetchSupabaseUser(accessToken);
  if (!user?.id) {
    json(res, 401, { error: "Student session is invalid or expired." });
    return null;
  }

  return user;
}

async function getAuthUserIdByEmail(email) {
  const result = await pool.query(
    `SELECT id::text AS id
     FROM auth.users
     WHERE LOWER(email) = LOWER($1)
     ORDER BY created_at DESC
     LIMIT 1`,
    [email],
  );

  return safeText(result.rows?.[0]?.id) || null;
}

async function updateSupabaseAuthPassword(userId, password) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = safeText(
      payload?.msg || payload?.error_description || payload?.error,
    );
    throw new Error(message || `Supabase password update failed (${response.status}).`);
  }
}

function getClientIp(req) {
  const forwardedFor = safeText(req.headers["x-forwarded-for"]);
  if (forwardedFor) {
    return safeText(forwardedFor.split(",")[0]);
  }
  return safeText(req.socket?.remoteAddress || req.connection?.remoteAddress || "unknown");
}

function checkRateLimit(req, key, windowMs, maxRequests) {
  const now = Date.now();
  const bucketKey = `${key}:${getClientIp(req)}`;
  const current = rateLimitStore.get(bucketKey);

  if (!current || now - current.windowStart >= windowMs) {
    rateLimitStore.set(bucketKey, { windowStart: now, count: 1 });
    return { limited: false, retryAfterSeconds: 0 };
  }

  current.count += 1;
  rateLimitStore.set(bucketKey, current);

  if (current.count > maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - current.windowStart)) / 1000),
    );
    return { limited: true, retryAfterSeconds };
  }

  return { limited: false, retryAfterSeconds: 0 };
}

function enforceRateLimit(req, res, key, windowMs, maxRequests, message) {
  const result = checkRateLimit(req, key, windowMs, maxRequests);
  if (!result.limited) return true;

  json(
    res,
    429,
    { error: message || "Too many requests. Please try again later." },
    { "Retry-After": String(result.retryAfterSeconds) },
  );
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 3_000_000) {
        reject(new Error("Request body too large."));
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function normalizeCollegeInput(body) {
  return {
    id: normalizeUuid(body.id),
    name: safeText(body.name || body.college_name),
    code: safeText(body.code || body.college_code) || null,
    type: normalizeType(body.type, "school"),
    contact_person: safeText(body.contact_person) || null,
    phone: safeText(body.phone) || null,
    email: safeText(body.email) || null,
    address: safeText(body.address) || null,
    city: safeText(body.city) || null,
    state: safeText(body.state) || null,
    status: normalizeStatus(body.status, "active"),
  };
}

function normalizeCenterInput(body) {
  return {
    id: normalizeUuid(body.id),
    college_id: normalizeUuid(body.college_id || body.collegeId),
    name: safeText(body.name || body.center_name),
    code: safeText(body.code || body.center_code) || null,
    address: safeText(body.address) || null,
    city: safeText(body.city) || null,
    state: safeText(body.state) || null,
    total_rooms: toIntOrZero(body.total_rooms),
    capacity: toIntOrZero(body.capacity),
    status: normalizeStatus(body.status, "active"),
    pincode: safeText(body.pincode) || null,
    contact_person: safeText(body.contact_person) || null,
    phone: safeText(body.phone) || null,
  };
}

function normalizeRoomInput(body) {
  return {
    id: normalizeUuid(body.id),
    center_id: normalizeUuid(
      body.center_id ||
        body.centerId ||
        body.exam_center_id ||
        body.examCenterId,
    ),
    room_no: safeText(body.room_no),
    floor: safeText(body.floor) || null,
    capacity: toIntOrZero(body.capacity),
    status: normalizeStatus(body.status, "active"),
    block: safeText(body.block) || null,
  };
}

function normalizeStudentRow(raw) {
  return {
    id: normalizeUuid(raw.id),
    college_id: normalizeUuid(raw.college_id || raw.collegeId),
    center_id: normalizeUuid(
      raw.center_id || raw.centerId || raw.exam_center_id || raw.examCenterId,
    ),
    room_id: normalizeUuid(raw.room_id || raw.roomId),
    rollno: safeText(raw.rollno),
    name: safeText(raw.name),
    room: safeText(raw.room),
    seat: safeText(raw.seat),
    school_name: safeText(raw.school_name),
    exam_center: safeText(raw.exam_center),
    class_name: safeText(raw.class_name),
  };
}

function studentMissingFields(row) {
  const missing = [];
  if (!row.rollno) missing.push("rollno");
  if (!row.name) missing.push("name");
  if (!row.room) missing.push("room");
  if (!row.seat) missing.push("seat");
  if (!row.school_name) missing.push("school_name");
  if (!row.exam_center) missing.push("exam_center");
  if (!row.class_name) missing.push("class_name");
  return missing;
}

function buildStudentsFilter(input) {
  const clauses = [];
  const params = [];

  if (input.search) {
    params.push(`%${input.search}%`);
    const idx = params.length;
    clauses.push(
      `(s.rollno ILIKE $${idx} OR s.name ILIKE $${idx} OR COALESCE(c.name, s.school_name, '') ILIKE $${idx} OR COALESCE(ec.name, s.exam_center, '') ILIKE $${idx} OR s.class_name ILIKE $${idx})`,
    );
  }

  if (input.center) {
    params.push(input.center);
    const idx = params.length;
    clauses.push(`LOWER(COALESCE(ec.name, s.exam_center, '')) = LOWER($${idx})`);
  }

  if (input.school) {
    params.push(input.school);
    const idx = params.length;
    clauses.push(`LOWER(COALESCE(c.name, s.school_name, '')) = LOWER($${idx})`);
  }

  if (input.className) {
    params.push(input.className);
    clauses.push(`s.class_name = $${params.length}`);
  }

  if (input.room) {
    params.push(input.room);
    const idx = params.length;
    clauses.push(`LOWER(s.room) = LOWER($${idx})`);
  }

  if (input.collegeId) {
    params.push(input.collegeId);
    clauses.push(`s.college_id = $${params.length}::uuid`);
  }

  if (input.centerId) {
    params.push(input.centerId);
    clauses.push(`s.center_id = $${params.length}::uuid`);
  }

  if (input.roomId) {
    params.push(input.roomId);
    const idx = params.length;
    clauses.push(`(s.room_id = $${idx}::uuid OR EXISTS (
      SELECT 1 FROM rooms rr
      WHERE rr.id = $${idx}::uuid
        AND rr.center_id = s.center_id
        AND LOWER(rr.room_no) = LOWER(s.room)
    ))`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

async function handleDashboard(req, res) {
  const statsResult = await pool.query(
    `SELECT
      (SELECT COUNT(*)::int FROM students) AS total_students,
      (SELECT COUNT(*)::int FROM colleges) AS total_colleges,
      (SELECT COUNT(*)::int FROM exam_centers) AS total_exam_centers,
      (SELECT COUNT(*)::int FROM rooms) AS total_rooms,
      (SELECT COUNT(DISTINCT concat_ws('::', COALESCE(NULLIF(exam_center, ''), 'N/A'), COALESCE(NULLIF(room, ''), 'N/A')))::int FROM students) AS total_seating_plans,
      (SELECT COUNT(*)::int FROM students WHERE created_at::date = CURRENT_DATE) AS recent_uploads_today`,
  );

  const stats = statsResult.rows[0] || {};
  const totalQrCodes =
    (stats.total_exam_centers || 0) > 0
      ? stats.total_exam_centers
      : (
          await pool.query(
            `SELECT COUNT(DISTINCT exam_center)::int AS total_qr_codes
             FROM students
             WHERE exam_center IS NOT NULL AND exam_center <> ''`,
          )
        ).rows[0]?.total_qr_codes || 0;

  const centersResult = await pool.query(
    `SELECT
      ec.id,
      ec.name AS center,
      COALESCE(c.name, 'Unassigned') AS college_name,
      COUNT(DISTINCT s.id)::int AS students,
      COUNT(DISTINCT r.id)::int AS rooms_used,
      COALESCE(ec.total_rooms, 0)::int AS total_rooms,
      CASE
        WHEN COALESCE(ec.total_rooms, 0) = 0 THEN 'Pending'
        WHEN COUNT(DISTINCT r.id) >= ec.total_rooms THEN 'Ready'
        ELSE 'In Progress'
      END AS status
     FROM exam_centers ec
     LEFT JOIN colleges c ON c.id = ec.college_id
     LEFT JOIN rooms r ON r.center_id = ec.id
     LEFT JOIN students s ON (s.center_id = ec.id OR LOWER(s.exam_center) = LOWER(ec.name))
     GROUP BY ec.id, ec.name, c.name, ec.total_rooms
     ORDER BY ec.name ASC`,
  );

  const collegeWiseResult = await pool.query(
    `SELECT
      COALESCE(c.name, NULLIF(s.school_name, ''), 'Unassigned') AS college_name,
      COUNT(*)::int AS students
     FROM students s
     LEFT JOIN colleges c ON c.id = s.college_id
     GROUP BY 1
     ORDER BY students DESC, college_name ASC
     LIMIT 10`,
  );

  json(res, 200, {
    stats: {
      ...stats,
      total_qr_codes: totalQrCodes,
      exam_centers: stats.total_exam_centers || 0,
      rooms_used: stats.total_rooms || 0,
      qr_codes: totalQrCodes,
    },
    centers: centersResult.rows || [],
    collegeWise: collegeWiseResult.rows || [],
    recentActivity: RECENT_ACTIVITY,
  });
}

async function handleSystemHealth(req, res) {
  const adminCredentials = await getAdminCredentials();
  const adminConfigured = hasAdminCredentials(adminCredentials);
  const checks = {
    api: { ok: true, message: "API server reachable" },
    database: { ok: false, message: "Not checked" },
    adminAuth: { ok: adminConfigured, message: "" },
  };

  checks.adminAuth.message = checks.adminAuth.ok
    ? adminCredentials.source === "admin_credentials"
      ? "Admin credentials configured in admin_credentials table"
      : adminCredentials.source === "settings"
        ? "Admin credentials configured in settings table"
      : "ADMIN_EMAIL / ADMIN_PASSWORD configured"
    : "Missing admin credentials in DB tables and environment";

  try {
    await pool.query("SELECT 1");
    checks.database = { ok: true, message: "Database connection OK" };
  } catch (error) {
    checks.database = {
      ok: false,
      message: error.message || "Database connection failed",
    };
  }

  const summary = {
    service: "seatsmart-api",
    status: checks.database.ok && checks.adminAuth.ok ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    port,
    corsAllowedOrigins: allowedOrigins,
    checks,
  };

  json(res, summary.status === "ok" ? 200 : 503, summary);
}

async function handleCentersOverview(req, res, url) {
  const search = safeText(url.searchParams.get("search")).toLowerCase();
  const params = [];
  let where = "";

  if (search) {
    params.push(`%${search}%`);
    where = "WHERE LOWER(ec.name) LIKE $1";
  }

  const result = await pool.query(
    `SELECT
      ec.id,
      ec.name AS center,
      COUNT(DISTINCT s.id)::int AS total_students,
      COUNT(DISTINCT r.id)::int AS total_rooms
     FROM exam_centers ec
     LEFT JOIN rooms r ON r.center_id = ec.id
     LEFT JOIN students s ON (s.center_id = ec.id OR LOWER(s.exam_center) = LOWER(ec.name))
     ${where}
     GROUP BY ec.id, ec.name
     ORDER BY ec.name ASC`,
    params,
  );

  if ((result.rows || []).length > 0) {
    json(res, 200, {
      rows: (result.rows || []).map((row) => ({ ...row, qr_status: "Ready" })),
    });
    return;
  }

  const legacy = await pool.query(
    `SELECT exam_center AS center, COUNT(*)::int AS total_students, COUNT(DISTINCT room)::int AS total_rooms
     FROM students
     WHERE exam_center IS NOT NULL AND exam_center <> ''
     GROUP BY exam_center
     ORDER BY exam_center ASC`,
  );

  json(res, 200, {
    rows: (legacy.rows || []).map((row) => ({ ...row, qr_status: "Ready" })),
  });
}

async function handleColleges(req, res, url) {
  const search = safeText(url.searchParams.get("search"));
  const type = safeText(url.searchParams.get("type"));
  const status = safeText(url.searchParams.get("status"));

  const params = [];
  const clauses = [];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    clauses.push(
      `(name ILIKE $${idx} OR code ILIKE $${idx} OR city ILIKE $${idx} OR state ILIKE $${idx})`,
    );
  }

  if (type) {
    params.push(type.toLowerCase());
    clauses.push(`LOWER(type) = $${params.length}`);
  }

  if (status) {
    params.push(status.toLowerCase());
    clauses.push(`LOWER(status) = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rowsResult = await pool.query(
    `SELECT *
     FROM colleges
     ${where}
     ORDER BY name ASC`,
    params,
  );

  const ids = (rowsResult.rows || []).map((row) => row.id);
  let countMap = new Map();

  if (ids.length > 0) {
    const countResult = await pool.query(
      `SELECT college_id, COUNT(*)::int AS total_students
       FROM students
       WHERE college_id = ANY($1::uuid[])
       GROUP BY college_id`,
      [ids],
    );

    countMap = new Map(
      (countResult.rows || []).map((row) => [row.college_id, row.total_students]),
    );
  }

  const rows = (rowsResult.rows || []).map((row) => {
    const canonicalName = safeText(row.name || row.college_name);
    const canonicalCode = safeText(row.code || row.college_code) || null;
    return {
      ...row,
      name: canonicalName,
      code: canonicalCode,
      college_name: canonicalName,
      college_code: canonicalCode,
      total_students: countMap.get(row.id) || 0,
    };
  });

  json(res, 200, { rows });
}

async function handleCollegeCreate(req, res) {
  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const payload = normalizeCollegeInput(body);
  if (!payload.name) {
    json(res, 400, { error: "name is required." });
    return;
  }

  try {
    const collegesColumns = await getCollegesColumns();
    const insertColumns = [
      "name",
      "code",
      "type",
      "contact_person",
      "phone",
      "email",
      "address",
      "city",
      "state",
      "status",
    ];
    const values = [
      payload.name,
      payload.code,
      payload.type,
      payload.contact_person,
      payload.phone,
      payload.email,
      payload.address,
      payload.city,
      payload.state,
      payload.status,
    ];

    // Keep legacy schema columns in sync when they still exist.
    if (collegesColumns.has("college_name")) {
      insertColumns.push("college_name");
      values.push(payload.name);
    }
    if (collegesColumns.has("college_code")) {
      insertColumns.push("college_code");
      values.push(payload.code);
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(",");
    const inserted = await pool.query(
      `INSERT INTO colleges (${insertColumns.join(", ")})
       VALUES (${placeholders})
       RETURNING *`,
      values,
    );

    json(res, 200, { ok: true, row: inserted.rows[0] });
  } catch (dbError) {
    const mapped = mapDatabaseError(dbError, "Unable to create school/college.");
    json(res, mapped.status, { error: mapped.message });
  }
}

async function handleCollegeUpdate(req, res) {
  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const payload = normalizeCollegeInput(body);
  if (!payload.id) {
    json(res, 400, { error: "id is required." });
    return;
  }
  if (!payload.name) {
    json(res, 400, { error: "name is required." });
    return;
  }

  try {
    const collegesColumns = await getCollegesColumns();
    const values = [
      payload.id,
      payload.name,
      payload.code,
      payload.type,
      payload.contact_person,
      payload.phone,
      payload.email,
      payload.address,
      payload.city,
      payload.state,
      payload.status,
    ];
    const setClauses = [
      "name = $2",
      "code = $3",
      "type = $4",
      "contact_person = $5",
      "phone = $6",
      "email = $7",
      "address = $8",
      "city = $9",
      "state = $10",
      "status = $11",
    ];

    if (collegesColumns.has("college_name")) {
      values.push(payload.name);
      setClauses.push(`college_name = $${values.length}`);
    }
    if (collegesColumns.has("college_code")) {
      values.push(payload.code);
      setClauses.push(`college_code = $${values.length}`);
    }
    setClauses.push("updated_at = now()");

    const updated = await pool.query(
      `UPDATE colleges
       SET ${setClauses.join(", ")}
       WHERE id = $1::uuid
       RETURNING *`,
      values,
    );

    if (!updated.rows[0]) {
      json(res, 404, { error: "College not found." });
      return;
    }

    json(res, 200, { ok: true, row: updated.rows[0] });
  } catch (dbError) {
    const mapped = mapDatabaseError(dbError, "Unable to update school/college.");
    json(res, mapped.status, { error: mapped.message });
  }
}

async function handleCollegeDelete(req, res) {
  const body = await readBody(req);
  const id = normalizeUuid(body.id);
  if (!id) {
    json(res, 400, { error: "id is required." });
    return;
  }

  const studentsRef = await pool.query(
    "SELECT COUNT(*)::int AS total FROM students WHERE college_id = $1::uuid",
    [id],
  );

  const centersRef = await pool.query(
    "SELECT COUNT(*)::int AS total FROM exam_centers WHERE college_id = $1::uuid",
    [id],
  );

  if ((studentsRef.rows[0]?.total || 0) > 0 || (centersRef.rows[0]?.total || 0) > 0) {
    json(res, 400, {
      error: "Cannot delete this school/college because it is linked to students or exam centers.",
    });
    return;
  }

  const deleted = await pool.query(
    "DELETE FROM colleges WHERE id = $1::uuid RETURNING id",
    [id],
  );

  if (!deleted.rows[0]) {
    json(res, 404, { error: "School/college not found." });
    return;
  }

  json(res, 200, { ok: true });
}

async function handleExamCenters(req, res, url) {
  const search = safeText(url.searchParams.get("search"));
  const city = safeText(url.searchParams.get("city"));
  const status = safeText(url.searchParams.get("status"));
  const collegeId = normalizeUuid(url.searchParams.get("collegeId"));

  const params = [];
  const clauses = [];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    clauses.push(`(ec.name ILIKE $${idx} OR ec.code ILIKE $${idx} OR ec.city ILIKE $${idx} OR ec.state ILIKE $${idx})`);
  }

  if (city) {
    params.push(city.toLowerCase());
    clauses.push(`LOWER(ec.city) = $${params.length}`);
  }

  if (status) {
    params.push(status.toLowerCase());
    clauses.push(`LOWER(ec.status) = $${params.length}`);
  }

  if (collegeId) {
    params.push(collegeId);
    clauses.push(`ec.college_id = $${params.length}::uuid`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const result = await pool.query(
    `SELECT
      ec.*,
      COALESCE(c.name, 'Unassigned') AS college_name,
      COUNT(DISTINCT s.id)::int AS students_count,
      COUNT(DISTINCT r.id)::int AS rooms_count
     FROM exam_centers ec
     LEFT JOIN colleges c ON c.id = ec.college_id
     LEFT JOIN students s ON (s.center_id = ec.id OR LOWER(s.exam_center) = LOWER(ec.name))
     LEFT JOIN rooms r ON r.center_id = ec.id
     ${where}
     GROUP BY ec.id, c.name
     ORDER BY ec.name ASC`,
    params,
  );

  const rows = (result.rows || []).map((row) => {
    const canonicalName = safeText(row.name || row.center_name);
    const canonicalCode = safeText(row.code || row.center_code) || null;
    return {
      ...row,
      name: canonicalName,
      code: canonicalCode,
      center_name: canonicalName,
      center_code: canonicalCode,
    };
  });

  json(res, 200, { rows });
}

async function handleExamCenterCreate(req, res) {
  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const payload = normalizeCenterInput(body);
  if (!payload.name) {
    json(res, 400, { error: "name is required." });
    return;
  }

  try {
    const examCentersColumns = await getExamCentersColumns();
    const insertColumns = [
      "college_id",
      "name",
      "code",
      "address",
      "city",
      "state",
      "total_rooms",
      "capacity",
      "status",
      "pincode",
      "contact_person",
      "phone",
    ];
    const values = [
      payload.college_id,
      payload.name,
      payload.code,
      payload.address,
      payload.city,
      payload.state,
      payload.total_rooms,
      payload.capacity,
      payload.status,
      payload.pincode,
      payload.contact_person,
      payload.phone,
    ];

    // Keep legacy schema columns in sync when they still exist.
    if (examCentersColumns.has("center_name")) {
      insertColumns.push("center_name");
      values.push(payload.name);
    }
    if (examCentersColumns.has("center_code")) {
      insertColumns.push("center_code");
      values.push(payload.code);
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(",");
    const inserted = await pool.query(
      `INSERT INTO exam_centers (${insertColumns.join(", ")})
       VALUES (${placeholders})
       RETURNING *`,
      values,
    );

    json(res, 200, { ok: true, row: inserted.rows[0] });
  } catch (dbError) {
    const mapped = mapDatabaseError(dbError, "Unable to create exam center.");
    json(res, mapped.status, { error: mapped.message });
  }
}

async function handleExamCenterUpdate(req, res) {
  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const payload = normalizeCenterInput(body);
  if (!payload.id) {
    json(res, 400, { error: "id is required." });
    return;
  }
  if (!payload.name) {
    json(res, 400, { error: "name is required." });
    return;
  }

  try {
    const examCentersColumns = await getExamCentersColumns();
    const values = [
      payload.id,
      payload.college_id,
      payload.name,
      payload.code,
      payload.address,
      payload.city,
      payload.state,
      payload.total_rooms,
      payload.capacity,
      payload.status,
      payload.pincode,
      payload.contact_person,
      payload.phone,
    ];
    const setClauses = [
      "college_id = $2::uuid",
      "name = $3",
      "code = $4",
      "address = $5",
      "city = $6",
      "state = $7",
      "total_rooms = $8",
      "capacity = $9",
      "status = $10",
      "pincode = $11",
      "contact_person = $12",
      "phone = $13",
    ];

    if (examCentersColumns.has("center_name")) {
      values.push(payload.name);
      setClauses.push(`center_name = $${values.length}`);
    }
    if (examCentersColumns.has("center_code")) {
      values.push(payload.code);
      setClauses.push(`center_code = $${values.length}`);
    }
    setClauses.push("updated_at = now()");

    const updated = await pool.query(
      `UPDATE exam_centers
       SET ${setClauses.join(", ")}
       WHERE id = $1::uuid
       RETURNING *`,
      values,
    );

    if (!updated.rows[0]) {
      json(res, 404, { error: "Exam center not found." });
      return;
    }

    json(res, 200, { ok: true, row: updated.rows[0] });
  } catch (dbError) {
    const mapped = mapDatabaseError(dbError, "Unable to update exam center.");
    json(res, mapped.status, { error: mapped.message });
  }
}

async function handleExamCenterDelete(req, res) {
  const body = await readBody(req);
  const id = normalizeUuid(body.id);

  if (!id) {
    json(res, 400, { error: "id is required." });
    return;
  }

  const studentsRef = await pool.query(
    "SELECT COUNT(*)::int AS total FROM students WHERE center_id = $1::uuid",
    [id],
  );

  const roomsRef = await pool.query(
    "SELECT COUNT(*)::int AS total FROM rooms WHERE center_id = $1::uuid",
    [id],
  );

  if ((studentsRef.rows[0]?.total || 0) > 0 || (roomsRef.rows[0]?.total || 0) > 0) {
    json(res, 400, {
      error: "Cannot delete this exam center because it is linked to students or rooms.",
    });
    return;
  }

  const deleted = await pool.query(
    "DELETE FROM exam_centers WHERE id = $1::uuid RETURNING id",
    [id],
  );

  if (!deleted.rows[0]) {
    json(res, 404, { error: "Exam center not found." });
    return;
  }

  json(res, 200, { ok: true });
}

async function handleRooms(req, res, url) {
  const search = safeText(url.searchParams.get("search"));
  const status = safeText(url.searchParams.get("status"));
  const centerId = normalizeUuid(url.searchParams.get("centerId"));

  const params = [];
  const clauses = [];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    clauses.push(`(r.room_no ILIKE $${idx} OR r.floor ILIKE $${idx} OR ec.name ILIKE $${idx})`);
  }

  if (status) {
    params.push(status.toLowerCase());
    clauses.push(`LOWER(r.status) = $${params.length}`);
  }

  if (centerId) {
    params.push(centerId);
    clauses.push(`r.center_id = $${params.length}::uuid`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const result = await pool.query(
    `SELECT
      r.*,
      ec.name AS center_name,
      ec.code AS center_code,
      COUNT(DISTINCT s.id)::int AS students_count
     FROM rooms r
     LEFT JOIN exam_centers ec ON ec.id = r.center_id
     LEFT JOIN students s ON (
       s.room_id = r.id
       OR (
         s.center_id = r.center_id
         AND LOWER(s.room) = LOWER(r.room_no)
       )
     )
     ${where}
     GROUP BY r.id, ec.name, ec.code
     ORDER BY ec.name ASC, r.room_no ASC`,
    params,
  );

  json(res, 200, { rows: result.rows || [] });
}

async function handleRoomCreate(req, res) {
  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const payload = normalizeRoomInput(body);
  if (!payload.center_id || !payload.room_no) {
    json(res, 400, { error: "center_id and room_no are required." });
    return;
  }

  try {
    const roomsColumns = await getRoomsColumns();
    const insertColumns = [
      "center_id",
      "room_no",
      "floor",
      "capacity",
      "status",
      "block",
    ];
    const values = [
      payload.center_id,
      payload.room_no,
      payload.floor,
      payload.capacity,
      payload.status,
      payload.block,
    ];

    // Keep legacy schema columns in sync when they still exist.
    if (roomsColumns.has("exam_center_id")) {
      insertColumns.push("exam_center_id");
      values.push(payload.center_id);
    }

    const placeholders = values
      .map((_, index) =>
        insertColumns[index] === "center_id" || insertColumns[index] === "exam_center_id"
          ? `$${index + 1}::uuid`
          : `$${index + 1}`,
      )
      .join(",");

    const inserted = await pool.query(
      `INSERT INTO rooms (${insertColumns.join(", ")})
       VALUES (${placeholders})
       RETURNING *`,
      values,
    );

    json(res, 200, { ok: true, row: inserted.rows[0] });
  } catch (dbError) {
    const mapped = mapDatabaseError(dbError, "Unable to create room.");
    json(res, mapped.status, { error: mapped.message });
  }
}

async function handleRoomUpdate(req, res) {
  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const payload = normalizeRoomInput(body);
  if (!payload.id || !payload.center_id || !payload.room_no) {
    json(res, 400, { error: "id, center_id and room_no are required." });
    return;
  }

  try {
    const roomsColumns = await getRoomsColumns();
    const values = [
      payload.id,
      payload.center_id,
      payload.room_no,
      payload.floor,
      payload.capacity,
      payload.status,
      payload.block,
    ];
    const setClauses = [
      "center_id = $2::uuid",
      "room_no = $3",
      "floor = $4",
      "capacity = $5",
      "status = $6",
      "block = $7",
    ];

    if (roomsColumns.has("exam_center_id")) {
      values.push(payload.center_id);
      setClauses.push(`exam_center_id = $${values.length}::uuid`);
    }
    setClauses.push("updated_at = now()");

    const updated = await pool.query(
      `UPDATE rooms
       SET ${setClauses.join(", ")}
       WHERE id = $1::uuid
       RETURNING *`,
      values,
    );

    if (!updated.rows[0]) {
      json(res, 404, { error: "Room not found." });
      return;
    }

    json(res, 200, { ok: true, row: updated.rows[0] });
  } catch (dbError) {
    const mapped = mapDatabaseError(dbError, "Unable to update room.");
    json(res, mapped.status, { error: mapped.message });
  }
}

async function handleRoomDelete(req, res) {
  const body = await readBody(req);
  const id = normalizeUuid(body.id);
  const forceDelete =
    body.force === true || safeText(body.force).toLowerCase() === "true";

  if (!id) {
    json(res, 400, { error: "id is required." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      "SELECT id, center_id, room_no FROM rooms WHERE id = $1::uuid LIMIT 1",
      [id],
    );

    const room = roomResult.rows[0];
    if (!room) {
      await client.query("ROLLBACK");
      json(res, 404, { error: "Room not found." });
      return;
    }

    const studentsRef = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM students
       WHERE room_id = $1::uuid
         OR (center_id = $2::uuid AND LOWER(room) = LOWER($3))`,
      [room.id, room.center_id, room.room_no],
    );

    const linkedStudents = studentsRef.rows[0]?.total || 0;
    if (linkedStudents > 0 && !forceDelete) {
      await client.query("ROLLBACK");
      json(res, 400, {
        error: "Cannot delete this room because it is linked to students.",
      });
      return;
    }

    if (linkedStudents > 0 && forceDelete) {
      await client.query(
        `UPDATE students
         SET room_id = NULL,
             room = NULL,
             updated_at = now()
         WHERE room_id = $1::uuid
            OR (center_id = $2::uuid AND LOWER(room) = LOWER($3))`,
        [room.id, room.center_id, room.room_no],
      );
    }

    const deleted = await client.query(
      "DELETE FROM rooms WHERE id = $1::uuid RETURNING id",
      [id],
    );
    if (!deleted.rows[0]) {
      await client.query("ROLLBACK");
      json(res, 404, { error: "Room not found." });
      return;
    }

    await client.query("COMMIT");
    json(res, 200, {
      ok: true,
      unlinked_students: forceDelete ? linkedStudents : 0,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

async function handleStudentOptions(req, res) {
  const legacyResult = await pool.query(
    `SELECT
      ARRAY(SELECT DISTINCT exam_center FROM students WHERE exam_center IS NOT NULL AND exam_center <> '' ORDER BY exam_center) AS centers,
      ARRAY(SELECT DISTINCT school_name FROM students WHERE school_name IS NOT NULL AND school_name <> '' ORDER BY school_name) AS schools,
      ARRAY(SELECT DISTINCT class_name FROM students WHERE class_name IS NOT NULL AND class_name <> '' ORDER BY class_name) AS classes,
      ARRAY(SELECT DISTINCT room FROM students WHERE room IS NOT NULL AND room <> '' ORDER BY room) AS rooms`,
  );

  const collegesResult = await pool.query(
    "SELECT id, name, code, type, status FROM colleges ORDER BY name ASC",
  );

  const centersResult = await pool.query(
    "SELECT id, name, code, city, status, college_id FROM exam_centers ORDER BY name ASC",
  );

  const roomsResult = await pool.query(
    `SELECT r.id, r.room_no, r.capacity, r.status, r.center_id, ec.name AS center_name
     FROM rooms r
     LEFT JOIN exam_centers ec ON ec.id = r.center_id
     ORDER BY ec.name ASC, r.room_no ASC`,
  );

  const centersSet = new Set(legacyResult.rows[0]?.centers || []);
  for (const center of centersResult.rows || []) {
    if (center.name) centersSet.add(center.name);
  }

  const roomsSet = new Set(legacyResult.rows[0]?.rooms || []);
  for (const room of roomsResult.rows || []) {
    if (room.room_no) roomsSet.add(room.room_no);
  }

  const schoolsSet = new Set(legacyResult.rows[0]?.schools || []);
  for (const college of collegesResult.rows || []) {
    if (college.name) schoolsSet.add(college.name);
  }

  json(res, 200, {
    centers: [...centersSet],
    schools: [...schoolsSet],
    classes: legacyResult.rows[0]?.classes || [],
    rooms: [...roomsSet],
    colleges: (collegesResult.rows || []).map((row) => ({
      ...row,
      college_name: row.name,
      college_code: row.code,
    })),
    examCenters: (centersResult.rows || []).map((row) => ({
      ...row,
      center_name: row.name,
      center_code: row.code,
    })),
    roomEntities: roomsResult.rows || [],
  });
}

async function handleStudents(req, res, url) {
  const search = safeText(url.searchParams.get("search"));
  const center = safeText(url.searchParams.get("center"));
  const school = safeText(url.searchParams.get("school"));
  const className = safeText(url.searchParams.get("className"));
  const room = safeText(url.searchParams.get("room"));
  const collegeId = normalizeUuid(url.searchParams.get("collegeId"));
  const centerId = normalizeUuid(
    url.searchParams.get("centerId") || url.searchParams.get("examCenterId"),
  );
  const roomId = normalizeUuid(url.searchParams.get("roomId"));
  const all = String(url.searchParams.get("all") || "") === "true";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(
    500,
    Math.max(1, Number(url.searchParams.get("pageSize") || 20)),
  );

  const { where, params } = buildStudentsFilter({
    search,
    center,
    school,
    className,
    room,
    collegeId,
    centerId,
    roomId,
  });

  const fromClause = `
    FROM students s
    LEFT JOIN colleges c ON c.id = s.college_id
    LEFT JOIN exam_centers ec ON ec.id = s.center_id
  `;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total ${fromClause} ${where}`,
    params,
  );

  const total = countResult.rows[0]?.total || 0;

  let query = `
    SELECT
      s.id,
      s.college_id,
      s.center_id,
      s.room_id,
      s.rollno,
      s.name,
      s.class_name,
      s.school_name,
      s.exam_center,
      s.room,
      s.seat,
      s.created_at,
      s.updated_at,
      c.name AS college_name,
      c.code AS college_code,
      ec.name AS center_name,
      ec.code AS center_code
    ${fromClause}
    ${where}
    ORDER BY s.rollno ASC
  `;

  const queryParams = [...params];
  if (!all) {
    queryParams.push(pageSize);
    queryParams.push((page - 1) * pageSize);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
  }

  const result = await pool.query(query, queryParams);

  const rows = (result.rows || []).map((row) => ({
    ...row,
    exam_center_id: row.center_id,
    display_school: row.college_name || row.school_name || "-",
    display_center: row.center_name || row.exam_center || "-",
    display_room: row.room || "-",
  }));

  json(res, 200, {
    rows,
    total,
    page: all ? 1 : page,
    pageSize: all ? rows.length : pageSize,
    totalPages: all ? 1 : Math.max(1, Math.ceil(total / pageSize)),
  });
}

async function resolveCenter(client, row, fallbackCenterId) {
  let centerId = row.center_id || fallbackCenterId || null;
  let centerName = row.exam_center || "";

  if (!centerId && centerName) {
    const centerByName = await client.query(
      `SELECT id, name FROM exam_centers WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [centerName],
    );
    centerId = centerByName.rows[0]?.id || null;
    centerName = centerByName.rows[0]?.name || centerName;
  }

  if (centerId && !centerName) {
    const centerById = await client.query(
      `SELECT name FROM exam_centers WHERE id = $1::uuid LIMIT 1`,
      [centerId],
    );
    centerName = centerById.rows[0]?.name || "";
  }

  return { centerId, centerName };
}

async function resolveRoomId(client, centerId, roomNo) {
  if (!centerId || !roomNo) return null;

  const roomResult = await client.query(
    `SELECT id FROM rooms WHERE center_id = $1::uuid AND LOWER(room_no) = LOWER($2) LIMIT 1`,
    [centerId, roomNo],
  );

  return roomResult.rows[0]?.id || null;
}

async function upsertStudent(client, row, fallbackIds = {}) {
  const resolved = await resolveCenter(client, row, fallbackIds.center_id || null);
  const centerId = resolved.centerId;
  const centerName = resolved.centerName || row.exam_center;
  const roomId = row.room_id || (await resolveRoomId(client, centerId, row.room));

  await client.query(
    `INSERT INTO students (
      college_id, center_id, room_id,
      rollno, name, room, seat, school_name, exam_center, class_name
    ) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (rollno, exam_center)
    DO UPDATE SET
      college_id = EXCLUDED.college_id,
      center_id = EXCLUDED.center_id,
      room_id = EXCLUDED.room_id,
      name = EXCLUDED.name,
      room = EXCLUDED.room,
      seat = EXCLUDED.seat,
      school_name = EXCLUDED.school_name,
      class_name = EXCLUDED.class_name,
      updated_at = now()`,
    [
      row.college_id || fallbackIds.college_id || null,
      centerId,
      roomId,
      row.rollno,
      row.name,
      row.room,
      row.seat,
      row.school_name,
      centerName,
      row.class_name,
    ],
  );
}

async function handleStudentsUpload(req, res) {
  const body = await readBody(req);
  if (!isObject(body) || !Array.isArray(body.rows)) {
    json(res, 400, { error: "rows array is required." });
    return;
  }

  const selectedCollegeId = normalizeUuid(body.college_id || body.collegeId);
  const selectedCenterId = normalizeUuid(
    body.center_id || body.centerId || body.exam_center_id || body.examCenterId,
  );

  const normalizedRows = body.rows.map((raw) => {
    const row = normalizeStudentRow(raw);
    if (selectedCollegeId && !row.college_id) row.college_id = selectedCollegeId;
    if (selectedCenterId && !row.center_id) row.center_id = selectedCenterId;
    return row;
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let selectedCenterName = "";
    let selectedCollegeName = "";

    if (selectedCollegeId) {
      const collegeLookup = await client.query(
        "SELECT name FROM colleges WHERE id = $1::uuid LIMIT 1",
        [selectedCollegeId],
      );
      selectedCollegeName = collegeLookup.rows[0]?.name || "";
    }

    if (selectedCenterId) {
      const centerLookup = await client.query(
        "SELECT name FROM exam_centers WHERE id = $1::uuid LIMIT 1",
        [selectedCenterId],
      );
      selectedCenterName = centerLookup.rows[0]?.name || "";
    }

    for (const row of normalizedRows) {
      if (!row.school_name && selectedCollegeName) row.school_name = selectedCollegeName;
      if (!row.exam_center && selectedCenterName) row.exam_center = selectedCenterName;
    }

    const invalidRows = [];
    normalizedRows.forEach((row, index) => {
      const missing = studentMissingFields(row);
      if (missing.length > 0) invalidRows.push({ index: index + 1, missing });
    });

    const validRows = normalizedRows.filter(
      (_, index) => !invalidRows.some((item) => item.index === index + 1),
    );

    if (validRows.length === 0) {
      await client.query("ROLLBACK");
      json(res, 400, { error: "No valid rows to upload.", invalidRows });
      return;
    }

    const duplicateKeys = [];
    const firstIndexByKey = new Map();
    const dedupedRows = [];

    validRows.forEach((row) => {
      const key = `${row.rollno.toLowerCase()}::${(row.exam_center || "").toLowerCase()}`;
      if (firstIndexByKey.has(key)) {
        duplicateKeys.push(key);
        return;
      }
      firstIndexByKey.set(key, true);
      dedupedRows.push(row);
    });

    const uploadKeys = dedupedRows.map(
      (row) => `${row.rollno.toLowerCase()}::${(row.exam_center || "").toLowerCase()}`,
    );

    const existing = await client.query(
      `SELECT LOWER(rollno) || '::' || LOWER(COALESCE(exam_center, '')) AS row_key
       FROM students
       WHERE LOWER(rollno) || '::' || LOWER(COALESCE(exam_center, '')) = ANY($1::text[])`,
      [uploadKeys],
    );

    const existingSet = new Set((existing.rows || []).map((row) => row.row_key));
    const toInsert = dedupedRows.filter(
      (row) =>
        !existingSet.has(`${row.rollno.toLowerCase()}::${(row.exam_center || "").toLowerCase()}`),
    );

    for (const row of toInsert) {
      await upsertStudent(client, row, {
        college_id: selectedCollegeId,
        center_id: selectedCenterId,
      });
    }

    await client.query("COMMIT");

    json(res, 200, {
      inserted: toInsert.length,
      skippedDuplicates: dedupedRows.length - toInsert.length,
      duplicateRollnos: [...new Set(duplicateKeys.map((key) => key.split("::")[0]))],
      invalidRows,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function handleStudentCreate(req, res) {
  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const row = normalizeStudentRow(body);
  const missing = studentMissingFields(row);
  if (missing.length > 0) {
    json(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await upsertStudent(client, row);
    await client.query("COMMIT");
    json(res, 200, { ok: true, message: "Student record created/updated successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function handleStudentUpdate(req, res) {
  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const id = normalizeUuid(body.id);
  if (!id) {
    json(res, 400, { error: "id is required." });
    return;
  }

  const row = normalizeStudentRow(body);
  const missing = studentMissingFields(row);
  if (missing.length > 0) {
    json(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const resolved = await resolveCenter(client, row, row.center_id || null);
    const roomId = row.room_id || (await resolveRoomId(client, resolved.centerId, row.room));

    const updated = await client.query(
      `UPDATE students
       SET college_id = $2::uuid,
           center_id = $3::uuid,
           room_id = $4::uuid,
           rollno = $5,
           name = $6,
           class_name = $7,
           school_name = $8,
           exam_center = $9,
           room = $10,
           seat = $11,
           updated_at = now()
       WHERE id = $1::uuid
       RETURNING *`,
      [
        id,
        row.college_id,
        resolved.centerId,
        roomId,
        row.rollno,
        row.name,
        row.class_name,
        row.school_name,
        resolved.centerName || row.exam_center,
        row.room,
        row.seat,
      ],
    );

    if (!updated.rows[0]) {
      await client.query("ROLLBACK");
      json(res, 404, { error: "Student not found." });
      return;
    }

    await client.query("COMMIT");
    json(res, 200, { ok: true, row: updated.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function handleStudentDelete(req, res) {
  const body = await readBody(req);
  const id = normalizeUuid(body.id);
  if (!id) {
    json(res, 400, { error: "id is required." });
    return;
  }

  const deleted = await pool.query(
    "DELETE FROM students WHERE id = $1::uuid RETURNING id",
    [id],
  );

  if (!deleted.rows[0]) {
    json(res, 404, { error: "Student not found." });
    return;
  }

  json(res, 200, { ok: true });
}

async function handleStudentSeat(req, res, url) {
  const rollno = safeText(url.searchParams.get("rollno"));
  const center = safeText(url.searchParams.get("center"));
  const centerId = normalizeUuid(url.searchParams.get("centerId"));
  const authUserId = safeText(req.studentUser?.id);

  if (!rollno) {
    json(res, 400, { error: "rollno is required." });
    return;
  }

  if (authUserId) {
    const profileResult = await pool.query(
      `SELECT rollno FROM student_profiles WHERE auth_user_id = $1::uuid LIMIT 1`,
      [authUserId],
    );
    const profileRollno = safeText(profileResult.rows[0]?.rollno).toLowerCase();
    const metadataRollno = safeText(req.studentUser?.user_metadata?.rollno).toLowerCase();
    const lockedRollno = profileRollno || metadataRollno;

    if (lockedRollno && lockedRollno !== rollno.toLowerCase()) {
      json(res, 403, {
        error: "You can only view your own seating details.",
      });
      return;
    }
  }

  const params = [rollno.toLowerCase()];
  let query = `
    SELECT
      s.rollno,
      s.name,
      s.class_name,
      COALESCE(c.name, s.school_name) AS school_name,
      COALESCE(ec.name, s.exam_center) AS exam_center,
      s.room,
      s.seat
    FROM students s
    LEFT JOIN colleges c ON c.id = s.college_id
    LEFT JOIN exam_centers ec ON ec.id = s.center_id
    WHERE LOWER(s.rollno) = $1
  `;

  if (centerId) {
    params.push(centerId);
    query += ` AND s.center_id = $${params.length}::uuid`;
  }

  if (center) {
    params.push(center.toLowerCase());
    query += ` AND LOWER(COALESCE(ec.name, s.exam_center, '')) = $${params.length}`;
  }

  query += " ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC LIMIT 1";

  const result = await pool.query(query, params);
  if (!result.rows[0]) {
    json(res, 404, {
      error: "No seating details found. Please check your roll number.",
    });
    return;
  }

  json(res, 200, { student: result.rows[0] });
}

async function handleGenerateSeatingPlan(req, res) {
  json(res, 200, {
    ok: true,
    message: "Seating plan generation completed using current student allocations.",
  });
}

async function handleSettingsGet(req, res) {
  const result = await pool.query(
    "SELECT id, key, value, updated_at FROM settings ORDER BY key ASC",
  );

  const map = {};
  for (const row of result.rows || []) {
    map[row.key] = row.value;
  }

  json(res, 200, { rows: result.rows || [], map });
}

async function handleSettingsUpsert(req, res) {
  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const entries = Array.isArray(body.entries)
    ? body.entries
    : Object.entries(body.settings || {}).map(([key, value]) => ({ key, value }));

  if (!Array.isArray(entries) || entries.length === 0) {
    json(res, 400, { error: "No settings entries provided." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const entry of entries) {
      const key = safeText(entry.key);
      if (!key) continue;

      const value =
        entry.value === undefined || entry.value === null ? "" : String(entry.value);

      await client.query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, value],
      );
    }

    await client.query("COMMIT");
    json(res, 200, { ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function handleStudentProfileUpsert(req, res) {
  if (
    !enforceRateLimit(
      req,
      res,
      "student-profile-upsert",
      60_000,
      STUDENT_PROFILE_UPSERT_RATE_LIMIT_MAX,
      "Too many profile sync requests. Please try again shortly.",
    )
  ) {
    return;
  }

  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const authUserId = normalizeUuid(body.auth_user_id || body.authUserId);
  const fullName = safeText(body.full_name || body.fullName);
  const rollno = safeText(body.rollno);
  const email = normalizeEmail(body.email);
  const sessionUserId = normalizeUuid(req.studentUser?.id);
  const sessionUserEmail = normalizeEmail(req.studentUser?.email);

  if (!authUserId || !fullName || !rollno || !email) {
    json(res, 400, {
      error: "auth_user_id, full_name, rollno and email are required.",
    });
    return;
  }

  if (!isValidEmail(email)) {
    json(res, 400, { error: "Invalid email address." });
    return;
  }

  if (!sessionUserId || authUserId !== sessionUserId) {
    json(res, 403, { error: "You can only update your own student profile." });
    return;
  }

  if (sessionUserEmail && sessionUserEmail !== email) {
    json(res, 403, { error: "Profile email must match your signed-in account." });
    return;
  }

  const result = await pool.query(
    `INSERT INTO student_profiles (auth_user_id, full_name, rollno, email)
     VALUES ($1::uuid, $2, $3, $4)
     ON CONFLICT (auth_user_id)
     DO UPDATE SET full_name = EXCLUDED.full_name, rollno = EXCLUDED.rollno, email = EXCLUDED.email
     RETURNING *`,
    [authUserId, fullName, rollno, email],
  );

  json(res, 200, { ok: true, row: result.rows[0] });
}

async function handleStudentPasswordResetDirect(req, res) {
  if (
    !enforceRateLimit(
      req,
      res,
      "student-password-reset-direct",
      10 * 60 * 1000,
      STUDENT_PASSWORD_RESET_RATE_LIMIT_MAX,
      "Too many password reset attempts. Please wait and try again.",
    )
  ) {
    return;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    json(res, 500, {
      error:
        "Student password reset service is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    });
    return;
  }

  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    json(res, 400, { error: "Email and password are required." });
    return;
  }

  if (!isValidEmail(email)) {
    json(res, 400, { error: "Invalid email address." });
    return;
  }

  if (password.length < 6) {
    json(res, 400, { error: "Password must be at least 6 characters." });
    return;
  }

  const userId = await getAuthUserIdByEmail(email);
  if (!userId) {
    json(res, 404, { error: "Student account not found." });
    return;
  }

  try {
    await updateSupabaseAuthPassword(userId, password);
  } catch (error) {
    json(res, 502, {
      error: safeText(error?.message) || "Unable to update student password.",
    });
    return;
  }

  json(res, 200, {
    ok: true,
    student: { email },
    savedTo: "supabase_auth",
  });
}

async function handleStudentSignupBypass(req, res) {
  json(res, 410, {
    error:
      "Signup bypass is disabled. Use Supabase Auth signup from the student portal.",
  });
}

async function handleAdminLogin(req, res) {
  if (
    !enforceRateLimit(
      req,
      res,
      "admin-login",
      10 * 60 * 1000,
      ADMIN_LOGIN_RATE_LIMIT_MAX,
      "Too many admin login attempts. Please wait and try again.",
    )
  ) {
    return;
  }

  const configuredAdmin = await getAdminCredentials();

  if (!hasAdminCredentials(configuredAdmin)) {
    json(res, 500, {
      error: "Admin credentials are not configured on the API server.",
    });
    return;
  }

  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    json(res, 400, { error: "Email and password are required." });
    return;
  }

  if (email !== configuredAdmin.email || password !== configuredAdmin.password) {
    json(res, 401, { error: "Invalid admin email or password." });
    return;
  }

  const token = createAdminSession(email);
  json(
    res,
    200,
    {
      ok: true,
      admin: { email },
      expiresInMs: ADMIN_SESSION_TTL_MS,
      sessionToken: token,
    },
    {
      "Set-Cookie": buildAdminCookie(token),
    },
  );
}

async function handleAdminCredentialsUpsert(req, res) {
  if (
    !enforceRateLimit(
      req,
      res,
      "admin-credentials-upsert",
      10 * 60 * 1000,
      ADMIN_LOGIN_RATE_LIMIT_MAX,
      "Too many admin credential update attempts. Please wait and try again.",
    )
  ) {
    return;
  }

  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    json(res, 400, { error: "Email and password are required." });
    return;
  }

  if (!isValidEmail(email)) {
    json(res, 400, { error: "Invalid email address." });
    return;
  }

  if (password.length < 6) {
    json(res, 400, { error: "Password must be at least 6 characters." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO admin_credentials (key, email, password, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (key)
       DO UPDATE SET email = EXCLUDED.email, password = EXCLUDED.password, updated_at = now()`,
      [ADMIN_CREDENTIALS_PRIMARY_KEY, email, password],
    );

    await client.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [ADMIN_SETTINGS_EMAIL_KEY, email],
    );

    await client.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [ADMIN_SETTINGS_PASSWORD_KEY, password],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  json(res, 200, {
    ok: true,
    admin: { email },
    savedTo: "database",
    envPreview: `ADMIN_EMAIL=${email}\nADMIN_PASSWORD=${password}`,
  });
}

async function handleAdminSession(req, res) {
  const token = getBearerToken(req) || getAdminCookieToken(req);

  const session = readAdminSession(token);
  if (!session) {
    json(res, 401, {
      authenticated: false,
      error: "Admin session is invalid or expired.",
    });
    return;
  }

  json(res, 200, {
    authenticated: true,
    admin: { email: session.email },
  });
}

async function handleAdminLogout(req, res) {
  const token = getBearerToken(req) || getAdminCookieToken(req);
  if (token) deleteAdminSession(token);
  json(
    res,
    200,
    { ok: true },
    {
      "Set-Cookie": buildExpiredAdminCookie(),
    },
  );
}

async function handleSuperAdminLogin(req, res) {
  if (
    !enforceRateLimit(
      req,
      res,
      "super-admin-login",
      10 * 60 * 1000,
      ADMIN_LOGIN_RATE_LIMIT_MAX,
      "Too many super admin login attempts. Please wait and try again.",
    )
  ) {
    return;
  }

  if (!hasSuperAdminCredentials()) {
    json(res, 500, {
      error: "Super admin credentials are not configured on the API server.",
    });
    return;
  }

  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    json(res, 400, { error: "Email and password are required." });
    return;
  }

  if (email !== superAdminEmail || password !== superAdminPassword) {
    json(res, 401, { error: "Invalid super admin email or password." });
    return;
  }

  const token = createSuperAdminSession(email);
  json(
    res,
    200,
    {
      ok: true,
      superAdmin: { email },
      expiresInMs: SUPER_ADMIN_SESSION_TTL_MS,
      sessionToken: token,
    },
    {
      "Set-Cookie": buildSuperAdminCookie(token),
    },
  );
}

async function handleSuperAdminSession(req, res) {
  const token = getBearerToken(req) || getSuperAdminCookieToken(req);

  const session = readSuperAdminSession(token);
  if (!session) {
    json(res, 401, {
      authenticated: false,
      error: "Super admin session is invalid or expired.",
    });
    return;
  }

  json(res, 200, {
    authenticated: true,
    superAdmin: { email: session.email },
  });
}

async function handleSuperAdminLogout(req, res) {
  const token = getBearerToken(req) || getSuperAdminCookieToken(req);
  if (token) deleteAdminSession(token);
  json(
    res,
    200,
    { ok: true },
    {
      "Set-Cookie": buildExpiredSuperAdminCookie(),
    },
  );
}

function normalizeAdminRole(value, fallback = "admin") {
  const normalized = safeText(value || fallback).toLowerCase();
  if (!normalized) return fallback;
  return normalized;
}

function normalizeAdminStatus(value, fallback = "active") {
  const normalized = safeText(value || fallback).toLowerCase();
  if (normalized !== "active" && normalized !== "inactive") return fallback;
  return normalized;
}

function normalizeJsonIdArray(value) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    const next = value.map((item) => safeText(item)).filter(Boolean);
    return next.length > 0 ? next : null;
  }

  const raw = safeText(value);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const next = parsed.map((item) => safeText(item)).filter(Boolean);
      return next.length > 0 ? next : null;
    }
  } catch {
    const next = raw
      .split(",")
      .map((item) => safeText(item))
      .filter(Boolean);
    return next.length > 0 ? next : null;
  }

  return null;
}

async function handleSuperAdminDashboard(req, res) {
  const statsResult = await pool.query(
    `SELECT
      (SELECT COUNT(*)::int FROM admins) AS total_admins,
      (SELECT COUNT(*)::int FROM colleges) AS total_colleges,
      (SELECT COUNT(*)::int FROM exam_centers) AS total_exam_centers,
      (SELECT COUNT(*)::int FROM rooms) AS total_rooms,
      (SELECT COUNT(*)::int FROM students) AS total_students,
      (
        SELECT COUNT(DISTINCT exam_center)::int
        FROM students
        WHERE exam_center IS NOT NULL AND exam_center <> ''
      ) AS total_qr_codes`,
  );

  const recentAdminsResult = await pool.query(
    `SELECT full_name, email, status
     FROM admins
     ORDER BY created_at DESC
     LIMIT 5`,
  );

  const health = {
    api: { ok: true, message: "API server reachable" },
    database: { ok: false, message: "Not checked" },
    superAdminAuth: {
      ok: hasSuperAdminCredentials(),
      message: hasSuperAdminCredentials()
        ? "SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD configured"
        : "Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD",
    },
  };

  try {
    await pool.query("SELECT 1");
    health.database = { ok: true, message: "Database connection OK" };
  } catch (error) {
    health.database = {
      ok: false,
      message: error.message || "Database connection failed",
    };
  }

  const stats = statsResult.rows?.[0] || {};
  const recentAdminMessages = (recentAdminsResult.rows || []).map((row) => {
    const fullName = safeText(row.full_name);
    const email = safeText(row.email);
    const status = normalizeAdminStatus(row.status, "active");
    if (fullName) return `Admin ${fullName} (${status})`;
    return `Admin ${email || "unknown"} (${status})`;
  });

  json(res, 200, {
    stats: {
      total_admins: Number(stats.total_admins || 0),
      total_colleges: Number(stats.total_colleges || 0),
      total_exam_centers: Number(stats.total_exam_centers || 0),
      total_rooms: Number(stats.total_rooms || 0),
      total_students: Number(stats.total_students || 0),
      total_qr_codes: Number(stats.total_qr_codes || 0),
    },
    recentActivity: [...RECENT_ACTIVITY, ...recentAdminMessages].slice(0, 10),
    systemHealth: health,
  });
}

async function handleSuperAdminAdminsGet(req, res, url) {
  const search = safeText(url.searchParams.get("search")).toLowerCase();
  const role = safeText(url.searchParams.get("role")).toLowerCase();
  const status = safeText(url.searchParams.get("status")).toLowerCase();
  const page = Math.max(1, toIntOrNull(url.searchParams.get("page")) || 1);
  const pageSize = Math.max(
    1,
    Math.min(100, toIntOrNull(url.searchParams.get("pageSize")) || 20),
  );

  const params = [];
  const whereClauses = [];

  if (search) {
    params.push(`%${search}%`);
    whereClauses.push(
      `(LOWER(full_name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(COALESCE(phone, '')) LIKE $${params.length})`,
    );
  }
  if (role) {
    params.push(role);
    whereClauses.push(`LOWER(role) = $${params.length}`);
  }
  if (status) {
    params.push(status);
    whereClauses.push(`LOWER(status) = $${params.length}`);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  const totalResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM admins ${whereSql}`,
    params,
  );

  const rowsParams = [...params, pageSize, offset];
  const rowsResult = await pool.query(
    `SELECT
      id,
      full_name,
      email,
      phone,
      role,
      status,
      assigned_college_ids,
      assigned_center_ids,
      created_at
     FROM admins
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${rowsParams.length - 1} OFFSET $${rowsParams.length}`,
    rowsParams,
  );

  json(res, 200, {
    rows: rowsResult.rows || [],
    total: Number(totalResult.rows?.[0]?.total || 0),
    page,
    pageSize,
  });
}

async function handleSuperAdminAdminsOptions(req, res) {
  const [collegesResult, centersResult] = await Promise.all([
    pool.query("SELECT id, name FROM colleges ORDER BY name ASC"),
    pool.query("SELECT id, name FROM exam_centers ORDER BY name ASC"),
  ]);

  json(res, 200, {
    colleges: collegesResult.rows || [],
    centers: centersResult.rows || [],
  });
}

async function handleSuperAdminAdminsCreate(req, res) {
  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const fullName = safeText(body.full_name || body.fullName);
  const email = normalizeEmail(body.email);
  const phone = safeText(body.phone) || null;
  const role = normalizeAdminRole(body.role, "admin");
  const status = normalizeAdminStatus(body.status, "active");
  const assignedCollegeIds = normalizeJsonIdArray(
    body.assigned_college_ids || body.assignedCollegeIds,
  );
  const assignedCenterIds = normalizeJsonIdArray(
    body.assigned_center_ids || body.assignedCenterIds,
  );

  if (!fullName || !email) {
    json(res, 400, { error: "full_name and email are required." });
    return;
  }

  if (!isValidEmail(email)) {
    json(res, 400, { error: "Invalid email address." });
    return;
  }

  const result = await pool.query(
    `INSERT INTO admins
      (full_name, email, phone, role, status, assigned_college_ids, assigned_center_ids, created_at)
     VALUES
      ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, now())
     RETURNING *`,
    [
      fullName,
      email,
      phone,
      role,
      status,
      assignedCollegeIds,
      assignedCenterIds,
    ],
  );

  json(res, 200, { ok: true, row: result.rows[0] });
}

async function handleSuperAdminAdminsUpdate(req, res) {
  const body = await readBody(req);
  if (!isObject(body)) {
    json(res, 400, { error: "Invalid request body." });
    return;
  }

  const id = normalizeUuid(body.id);
  if (!id) {
    json(res, 400, { error: "id is required." });
    return;
  }

  const fullName = safeText(body.full_name || body.fullName);
  const email = normalizeEmail(body.email);
  const phone = safeText(body.phone) || null;
  const role = normalizeAdminRole(body.role, "admin");
  const status = normalizeAdminStatus(body.status, "active");
  const assignedCollegeIds = normalizeJsonIdArray(
    body.assigned_college_ids || body.assignedCollegeIds,
  );
  const assignedCenterIds = normalizeJsonIdArray(
    body.assigned_center_ids || body.assignedCenterIds,
  );

  if (!fullName || !email) {
    json(res, 400, { error: "full_name and email are required." });
    return;
  }

  if (!isValidEmail(email)) {
    json(res, 400, { error: "Invalid email address." });
    return;
  }

  const result = await pool.query(
    `UPDATE admins
     SET full_name = $2,
         email = $3,
         phone = $4,
         role = $5,
         status = $6,
         assigned_college_ids = $7::jsonb,
         assigned_center_ids = $8::jsonb
     WHERE id = $1::uuid
     RETURNING *`,
    [
      id,
      fullName,
      email,
      phone,
      role,
      status,
      assignedCollegeIds,
      assignedCenterIds,
    ],
  );

  if (!result.rows[0]) {
    json(res, 404, { error: "Admin not found." });
    return;
  }

  json(res, 200, { ok: true, row: result.rows[0] });
}

async function handleSuperAdminAdminsDelete(req, res) {
  const body = await readBody(req);
  const id = normalizeUuid(body.id);
  if (!id) {
    json(res, 400, { error: "id is required." });
    return;
  }

  const deleted = await pool.query(
    "DELETE FROM admins WHERE id = $1::uuid RETURNING id",
    [id],
  );

  if (!deleted.rows[0]) {
    json(res, 404, { error: "Admin not found." });
    return;
  }

  json(res, 200, { ok: true });
}

async function handleSuperAdminAdminsToggleStatus(req, res) {
  const body = await readBody(req);
  const id = normalizeUuid(body.id);
  if (!id) {
    json(res, 400, { error: "id is required." });
    return;
  }

  const status = normalizeAdminStatus(body.status, "active");
  const result = await pool.query(
    `UPDATE admins
     SET status = $2
     WHERE id = $1::uuid
     RETURNING *`,
    [id, status],
  );

  if (!result.rows[0]) {
    json(res, 404, { error: "Admin not found." });
    return;
  }

  json(res, 200, { ok: true, row: result.rows[0] });
}

const ADMIN_WRITE_ROUTES = new Set([
  "/api/colleges/create",
  "/api/colleges/update",
  "/api/colleges/delete",
  "/api/exam-centers/create",
  "/api/exam-centers/update",
  "/api/exam-centers/delete",
  "/api/rooms/create",
  "/api/rooms/update",
  "/api/rooms/delete",
  "/api/students/upload",
  "/api/students/create",
  "/api/students/update",
  "/api/students/delete",
  "/api/seating-plan/generate",
  "/api/settings/upsert",
]);

const ADMIN_READ_ROUTES = new Set([
  "/api/system/health",
  "/api/dashboard",
  "/api/colleges",
  "/api/exam-centers",
  "/api/rooms",
  "/api/centers",
  "/api/students/options",
  "/api/students",
  "/api/settings",
]);

const SUPER_ADMIN_WRITE_ROUTES = new Set([
  "/api/super-admin/admins/create",
  "/api/super-admin/admins/update",
  "/api/super-admin/admins/delete",
  "/api/super-admin/admins/toggle-status",
  "/api/super-admin/colleges/create",
  "/api/super-admin/colleges/update",
  "/api/super-admin/colleges/delete",
  "/api/super-admin/exam-centers/create",
  "/api/super-admin/exam-centers/update",
  "/api/super-admin/exam-centers/delete",
  "/api/super-admin/rooms/create",
  "/api/super-admin/rooms/update",
  "/api/super-admin/rooms/delete",
  "/api/super-admin/students/upload",
  "/api/super-admin/students/create",
  "/api/super-admin/students/update",
  "/api/super-admin/students/delete",
  "/api/super-admin/seating-plan/generate",
  "/api/super-admin/settings/upsert",
]);

const SUPER_ADMIN_READ_ROUTES = new Set([
  "/api/super-admin/dashboard",
  "/api/super-admin/system/health",
  "/api/super-admin/admins",
  "/api/super-admin/admins/options",
  "/api/super-admin/colleges",
  "/api/super-admin/exam-centers",
  "/api/super-admin/rooms",
  "/api/super-admin/centers",
  "/api/super-admin/students/options",
  "/api/super-admin/students",
  "/api/super-admin/settings",
]);

async function route(req, res) {
  if (!isOriginAllowed(req)) {
    json(res, 403, { error: "Origin not allowed." });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, buildCorsHeaders(req));
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const { pathname } = url;

  try {
    if (req.method === "GET" && SUPER_ADMIN_READ_ROUTES.has(pathname)) {
      const session = requireSuperAdminSession(req, res);
      if (!session) return;
    }

    if (req.method === "POST" && SUPER_ADMIN_WRITE_ROUTES.has(pathname)) {
      const session = requireSuperAdminSession(req, res);
      if (!session) return;
    }

    if (req.method === "GET" && ADMIN_READ_ROUTES.has(pathname)) {
      const session = requireAdminSession(req, res);
      if (!session) return;
    }

    if (req.method === "POST" && ADMIN_WRITE_ROUTES.has(pathname)) {
      const session = requireAdminSession(req, res);
      if (!session) return;
    }

    if (req.method === "GET" && pathname === "/api/student-seat") {
      const studentUser = await requireStudentSession(req, res);
      if (!studentUser) return;
      req.studentUser = studentUser;

      if (
        !enforceRateLimit(
          req,
          res,
          "student-seat",
          60_000,
          STUDENT_SEAT_RATE_LIMIT_MAX,
          "Too many seat lookup attempts. Please wait a minute and try again.",
        )
      ) {
        return;
      }
    }

    if (req.method === "GET" && pathname === "/health") {
      json(res, 200, { status: "ok", service: "seatsmart-api" });
      return;
    }

    if (req.method === "POST" && pathname === "/api/admin/login") {
      await handleAdminLogin(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/admin/credentials/upsert") {
      await handleAdminCredentialsUpsert(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/admin/session") {
      await handleAdminSession(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/admin/logout") {
      await handleAdminLogout(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/super-admin/login") {
      await handleSuperAdminLogin(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/super-admin/session") {
      await handleSuperAdminSession(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/logout") {
      await handleSuperAdminLogout(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/super-admin/dashboard") {
      await handleSuperAdminDashboard(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/super-admin/system/health") {
      await handleSystemHealth(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/super-admin/admins") {
      await handleSuperAdminAdminsGet(req, res, url);
      return;
    }
    if (req.method === "GET" && pathname === "/api/super-admin/admins/options") {
      await handleSuperAdminAdminsOptions(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/admins/create") {
      await handleSuperAdminAdminsCreate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/admins/update") {
      await handleSuperAdminAdminsUpdate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/admins/delete") {
      await handleSuperAdminAdminsDelete(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/admins/toggle-status") {
      await handleSuperAdminAdminsToggleStatus(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/super-admin/colleges") {
      await handleColleges(req, res, url);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/colleges/create") {
      await handleCollegeCreate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/colleges/update") {
      await handleCollegeUpdate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/colleges/delete") {
      await handleCollegeDelete(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/super-admin/exam-centers") {
      await handleExamCenters(req, res, url);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/exam-centers/create") {
      await handleExamCenterCreate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/exam-centers/update") {
      await handleExamCenterUpdate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/exam-centers/delete") {
      await handleExamCenterDelete(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/super-admin/rooms") {
      await handleRooms(req, res, url);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/rooms/create") {
      await handleRoomCreate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/rooms/update") {
      await handleRoomUpdate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/rooms/delete") {
      await handleRoomDelete(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/super-admin/centers") {
      await handleCentersOverview(req, res, url);
      return;
    }

    if (req.method === "GET" && pathname === "/api/super-admin/students/options") {
      await handleStudentOptions(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/super-admin/students") {
      await handleStudents(req, res, url);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/students/upload") {
      await handleStudentsUpload(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/students/create") {
      await handleStudentCreate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/students/update") {
      await handleStudentUpdate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/students/delete") {
      await handleStudentDelete(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/super-admin/seating-plan/generate") {
      await handleGenerateSeatingPlan(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/super-admin/settings") {
      await handleSettingsGet(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/super-admin/settings/upsert") {
      await handleSettingsUpsert(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/dashboard") {
      await handleDashboard(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/system/health") {
      await handleSystemHealth(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/colleges") {
      await handleColleges(req, res, url);
      return;
    }
    if (req.method === "POST" && pathname === "/api/colleges/create") {
      await handleCollegeCreate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/colleges/update") {
      await handleCollegeUpdate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/colleges/delete") {
      await handleCollegeDelete(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/exam-centers") {
      await handleExamCenters(req, res, url);
      return;
    }
    if (req.method === "POST" && pathname === "/api/exam-centers/create") {
      await handleExamCenterCreate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/exam-centers/update") {
      await handleExamCenterUpdate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/exam-centers/delete") {
      await handleExamCenterDelete(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/rooms") {
      await handleRooms(req, res, url);
      return;
    }
    if (req.method === "POST" && pathname === "/api/rooms/create") {
      await handleRoomCreate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/rooms/update") {
      await handleRoomUpdate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/rooms/delete") {
      await handleRoomDelete(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/centers") {
      await handleCentersOverview(req, res, url);
      return;
    }

    if (req.method === "GET" && pathname === "/api/students/options") {
      await handleStudentOptions(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/students") {
      await handleStudents(req, res, url);
      return;
    }
    if (req.method === "POST" && pathname === "/api/students/upload") {
      await handleStudentsUpload(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/students/create") {
      await handleStudentCreate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/students/update") {
      await handleStudentUpdate(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/students/delete") {
      await handleStudentDelete(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/student-profiles/upsert") {
      const studentUser = await requireStudentSession(req, res);
      if (!studentUser) return;
      req.studentUser = studentUser;

      await handleStudentProfileUpsert(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/student-seat") {
      await handleStudentSeat(req, res, url);
      return;
    }

    if (req.method === "POST" && pathname === "/api/student-auth/signup-bypass") {
      await handleStudentSignupBypass(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/student-auth/reset-password-direct") {
      await handleStudentPasswordResetDirect(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/seating-plan/generate") {
      await handleGenerateSeatingPlan(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/settings") {
      await handleSettingsGet(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/settings/upsert") {
      await handleSettingsUpsert(req, res);
      return;
    }

    text(res, 404, "Not Found");
  } catch (error) {
    console.error("SeatSmart API route error:", {
      method: req.method,
      pathname,
      message: error?.message || "Unknown error",
    });
    json(res, 500, { error: "Internal server error." });
  }
}

async function runMigrations() {
  const migrationFiles = [path.join(__dirname, "sql", "supabase.sql")];

  const client = await pool.connect();
  try {
    for (const filePath of migrationFiles) {
      const sql = fs.readFileSync(filePath, "utf8");
      if (!sql.trim()) continue;
      await client.query(sql);
    }
  } finally {
    client.release();
  }
}

async function startServer() {
  await runMigrations();

  const server = http.createServer(route);
  server.listen(port, () => {
    console.log(`SeatSmart API running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start SeatSmart API:", error);
  process.exit(1);
});
