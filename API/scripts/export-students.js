const fs = require("fs");
const path = require("path");
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

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function normalizeCsvValue(key, value) {
  if ((key === "created_at" || key === "updated_at") && value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function toStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function run() {
  loadEnvFile();
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

  try {
    const result = await pool.query(
      `SELECT rollno, name, class_name, school_name, exam_center, room, seat, created_at, updated_at
       FROM students
       ORDER BY updated_at DESC NULLS LAST, created_at DESC`,
    );

    const rows = result.rows || [];
    const headers = [
      "rollno",
      "name",
      "class_name",
      "school_name",
      "exam_center",
      "room",
      "seat",
      "created_at",
      "updated_at",
    ];

    const lines = [headers.join(",")];
    for (const row of rows) {
      lines.push(
        headers
          .map((key) => csvEscape(normalizeCsvValue(key, row[key])))
          .join(","),
      );
    }

    const backupDir = path.resolve(process.cwd(), "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const outputPath = path.join(backupDir, `students-${toStamp()}.csv`);
    fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

    console.log(`Export complete: ${outputPath}`);
    console.log(`Rows exported: ${rows.length}`);
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Export failed:", error.message || error);
  process.exit(1);
});
