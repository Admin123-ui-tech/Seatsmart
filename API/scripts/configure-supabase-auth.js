const fs = require("fs");
const path = require("path");

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

function clean(value) {
  const text = String(value || "").trim();
  return text || null;
}

async function run() {
  loadEnvFile();

  const token = clean(process.env.SUPABASE_ACCESS_TOKEN);
  const projectRef = clean(process.env.SUPABASE_PROJECT_REF);
  const siteUrl = clean(process.env.SUPABASE_SITE_URL);
  const additionalRedirectUrlsRaw = clean(
    process.env.SUPABASE_ADDITIONAL_REDIRECT_URLS,
  );

  if (!token || !projectRef || !siteUrl) {
    throw new Error(
      "Missing SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, or SUPABASE_SITE_URL.",
    );
  }

  const body = {
    site_url: siteUrl,
  };

  const additionalRedirectUrls = additionalRedirectUrlsRaw
    ? additionalRedirectUrlsRaw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (additionalRedirectUrls.length > 0) {
    body.additional_redirect_urls = additionalRedirectUrls;
  }

  const smtpAdminEmail = clean(process.env.SUPABASE_SMTP_ADMIN_EMAIL);
  const smtpHost = clean(process.env.SUPABASE_SMTP_HOST);
  const smtpPort = clean(process.env.SUPABASE_SMTP_PORT);
  const smtpUser = clean(process.env.SUPABASE_SMTP_USER);
  const smtpPass = clean(process.env.SUPABASE_SMTP_PASS);
  const smtpSenderName = clean(process.env.SUPABASE_SMTP_SENDER_NAME);
  const smtpMaxFrequency = clean(process.env.SUPABASE_SMTP_MAX_FREQUENCY);

  if (smtpAdminEmail) body.smtp_admin_email = smtpAdminEmail;
  if (smtpHost) body.smtp_host = smtpHost;
  if (smtpPort) body.smtp_port = smtpPort;
  if (smtpUser) body.smtp_user = smtpUser;
  if (smtpPass) body.smtp_pass = smtpPass;
  if (smtpSenderName) body.smtp_sender_name = smtpSenderName;
  if (smtpMaxFrequency) {
    const parsed = Number(smtpMaxFrequency);
    if (Number.isFinite(parsed)) body.smtp_max_frequency = parsed;
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error_description ||
      payload?.error ||
      `HTTP ${response.status}`;
    throw new Error(`Supabase auth config update failed: ${message}`);
  }

  console.log("Supabase auth config updated successfully.");
  console.log(
    JSON.stringify(
      {
        projectRef,
        applied: {
          site_url: body.site_url,
          additional_redirect_urls: body.additional_redirect_urls || [],
          smtp_host: body.smtp_host || null,
          smtp_port: body.smtp_port || null,
          smtp_sender_name: body.smtp_sender_name || null,
          smtp_admin_email: body.smtp_admin_email || null,
        },
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
