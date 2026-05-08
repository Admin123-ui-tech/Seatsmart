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

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function findLatestBackup(backupDir) {
  const entries = fs
    .readdirSync(backupDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^students-\d{8}-\d{6}\.csv$/.test(entry.name))
    .map((entry) => ({
      name: entry.name,
      fullPath: path.join(backupDir, entry.name),
      mtimeMs: fs.statSync(path.join(backupDir, entry.name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return entries[0] || null;
}

function normalizeTimestamp(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid timestamp format in backup: ${text}`);
  }
  return parsed.toISOString();
}

async function run() {
  loadEnvFile();

  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL (or DIRECT_URL) in API environment.");
  }

  const backupDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    throw new Error("No backups directory found. Run npm run backup:students first.");
  }

  const latest = findLatestBackup(backupDir);
  if (!latest) {
    throw new Error("No students backup file found. Run npm run backup:students first.");
  }

  const raw = fs.readFileSync(latest.fullPath, "utf8").trim();
  if (!raw) throw new Error("Backup file is empty.");

  const lines = raw.split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  const requiredHeaders = [
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

  for (const key of requiredHeaders) {
    if (!headers.includes(key)) {
      throw new Error(`Backup missing required column: ${key}`);
    }
  }

  const rows = lines.slice(1).filter(Boolean).map((line) => {
    const cells = parseCsvLine(line);
    const obj = {};
    headers.forEach((key, idx) => {
      obj[key] = cells[idx] ?? "";
    });
    return obj;
  });

  const requiresSsl =
    !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: requiresSsl ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE TEMP TABLE students_restore_test (
      rollno text,
      name text,
      class_name text,
      school_name text,
      exam_center text,
      room text,
      seat text,
      created_at timestamptz,
      updated_at timestamptz
    ) ON COMMIT DROP`);

    for (const row of rows) {
      await client.query(
        `INSERT INTO students_restore_test
         (rollno, name, class_name, school_name, exam_center, room, seat, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9::timestamptz)`,
        [
          row.rollno,
          row.name,
          row.class_name,
          row.school_name,
          row.exam_center,
          row.room,
          row.seat,
          normalizeTimestamp(row.created_at),
          normalizeTimestamp(row.updated_at),
        ],
      );
    }

    const validation = await client.query(
      "SELECT COUNT(*)::int AS total FROM students_restore_test",
    );
    const restoredCount = validation.rows[0]?.total || 0;
    if (restoredCount !== rows.length) {
      throw new Error(
        `Restore validation mismatch: parsed ${rows.length}, inserted ${restoredCount}`,
      );
    }

    await client.query("ROLLBACK");
    console.log(`Restore dry-run passed using backup: ${latest.name}`);
    console.log(`Rows validated: ${restoredCount}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Restore dry-run failed:", error.message || error);
  process.exit(1);
});
