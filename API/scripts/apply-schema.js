const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = String(line || "").trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, "..", ".env"));

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL (or DIRECT_URL) in API/.env");
}

const requiresSsl =
  !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
});

async function run() {
  const sqlPath = path.join(__dirname, "..", "src", "sql", "supabase.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  if (!sql.trim()) {
    throw new Error("Schema SQL file is empty.");
  }

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("Schema applied successfully.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Failed to apply schema:", error.message || error);
  process.exit(1);
});

