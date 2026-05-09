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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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

async function upsertCollege(client, item) {
  const result = await client.query(
    `INSERT INTO colleges
      (name, code, type, contact_person, phone, email, address, city, state, status, created_at, updated_at)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', now(), now())
     ON CONFLICT (code)
     DO UPDATE
       SET name = EXCLUDED.name,
           type = EXCLUDED.type,
           contact_person = EXCLUDED.contact_person,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           address = EXCLUDED.address,
           city = EXCLUDED.city,
           state = EXCLUDED.state,
           status = 'active',
           updated_at = now()
     RETURNING id, name, code`,
    [
      item.name,
      item.code,
      item.type || "college",
      item.contact_person || null,
      item.phone || null,
      item.email || null,
      item.address || null,
      item.city || null,
      item.state || null,
    ],
  );

  return result.rows[0];
}

async function upsertCenter(client, item) {
  const result = await client.query(
    `INSERT INTO exam_centers
      (name, code, address, city, state, total_rooms, capacity, status, college_id, created_at, updated_at)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, 'active', $8::uuid, now(), now())
     ON CONFLICT (code)
     DO UPDATE
       SET name = EXCLUDED.name,
           address = EXCLUDED.address,
           city = EXCLUDED.city,
           state = EXCLUDED.state,
           total_rooms = EXCLUDED.total_rooms,
           capacity = EXCLUDED.capacity,
           status = 'active',
           college_id = EXCLUDED.college_id,
           updated_at = now()
     RETURNING id, name, code, college_id`,
    [
      item.name,
      item.code,
      item.address || null,
      item.city || null,
      item.state || null,
      Number(item.total_rooms || 0),
      Number(item.capacity || 0),
      item.college_id || null,
    ],
  );

  return result.rows[0];
}

async function upsertRoom(client, item) {
  await client.query(
    `INSERT INTO rooms
      (center_id, room_no, floor, capacity, status, created_at, updated_at)
     VALUES
      ($1::uuid, $2, $3, $4, 'active', now(), now())
     ON CONFLICT (center_id, room_no)
     DO UPDATE
       SET floor = EXCLUDED.floor,
           capacity = EXCLUDED.capacity,
           status = 'active',
           updated_at = now()`,
    [
      item.center_id,
      item.room_no,
      item.floor || null,
      Number(item.capacity || 0),
    ],
  );
}

async function upsertAdmin(client, item) {
  const assignedCollegeIds =
    Array.isArray(item.assigned_college_ids) && item.assigned_college_ids.length > 0
      ? JSON.stringify(item.assigned_college_ids)
      : null;
  const assignedCenterIds =
    Array.isArray(item.assigned_center_ids) && item.assigned_center_ids.length > 0
      ? JSON.stringify(item.assigned_center_ids)
      : null;

  await client.query(
    `INSERT INTO admins
      (full_name, email, phone, role, status, assigned_college_ids, assigned_center_ids, created_at)
     VALUES
      ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, now())
     ON CONFLICT (email)
     DO UPDATE
       SET full_name = EXCLUDED.full_name,
           phone = EXCLUDED.phone,
           role = EXCLUDED.role,
           status = EXCLUDED.status,
           assigned_college_ids = EXCLUDED.assigned_college_ids,
           assigned_center_ids = EXCLUDED.assigned_center_ids`,
    [
      item.full_name,
      normalizeEmail(item.email),
      item.phone || null,
      item.role || "admin",
      item.status || "active",
      assignedCollegeIds,
      assignedCenterIds,
    ],
  );
}

async function upsertStudent(client, item) {
  await client.query(
    `INSERT INTO students
      (rollno, name, room, seat, school_name, exam_center, class_name, college_id, center_id, created_at, updated_at)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8::uuid, $9::uuid, now(), now())
     ON CONFLICT (rollno, exam_center)
     DO UPDATE
       SET name = EXCLUDED.name,
           room = EXCLUDED.room,
           seat = EXCLUDED.seat,
           school_name = EXCLUDED.school_name,
           class_name = EXCLUDED.class_name,
           college_id = EXCLUDED.college_id,
           center_id = EXCLUDED.center_id,
           updated_at = now()`,
    [
      item.rollno,
      item.name,
      item.room,
      item.seat,
      item.school_name,
      item.exam_center,
      item.class_name,
      item.college_id || null,
      item.center_id || null,
    ],
  );
}

async function upsertSetting(client, key, value) {
  await client.query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  );
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const college1 = await upsertCollege(client, {
      name: "North Valley College",
      code: "NVC001",
      type: "college",
      contact_person: "Aisha Khan",
      phone: "9876543210",
      email: "northvalley@example.com",
      address: "MG Road",
      city: "Bengaluru",
      state: "Karnataka",
    });
    const college2 = await upsertCollege(client, {
      name: "Sunrise PU College",
      code: "SPC002",
      type: "college",
      contact_person: "Rahul Das",
      phone: "9876501234",
      email: "sunrise@example.com",
      address: "Ring Road",
      city: "Mysuru",
      state: "Karnataka",
    });

    const center1 = await upsertCenter(client, {
      name: "Central Exam Center",
      code: "CEC101",
      address: "Station Road",
      city: "Bengaluru",
      state: "Karnataka",
      total_rooms: 8,
      capacity: 320,
      college_id: college1.id,
    });
    const center2 = await upsertCenter(client, {
      name: "City Public Center",
      code: "CPC102",
      address: "College Street",
      city: "Mysuru",
      state: "Karnataka",
      total_rooms: 6,
      capacity: 240,
      college_id: college2.id,
    });

    const rooms = [
      { center_id: center1.id, room_no: "A101", floor: "1", capacity: 40 },
      { center_id: center1.id, room_no: "A102", floor: "1", capacity: 40 },
      { center_id: center1.id, room_no: "B201", floor: "2", capacity: 40 },
      { center_id: center2.id, room_no: "C101", floor: "1", capacity: 40 },
      { center_id: center2.id, room_no: "C102", floor: "1", capacity: 40 },
      { center_id: center2.id, room_no: "D201", floor: "2", capacity: 40 },
    ];
    for (const room of rooms) {
      await upsertRoom(client, room);
    }

    await upsertAdmin(client, {
      full_name: "Dummy Admin One",
      email: "dummyadmin1@seatsmart.com",
      phone: "9000000001",
      role: "admin",
      status: "active",
      assigned_college_ids: [college1.id],
      assigned_center_ids: [center1.id],
    });
    await upsertAdmin(client, {
      full_name: "Dummy Admin Two",
      email: "dummyadmin2@seatsmart.com",
      phone: "9000000002",
      role: "admin",
      status: "active",
      assigned_college_ids: [college2.id],
      assigned_center_ids: [center2.id],
    });

    const students = [
      {
        rollno: "NVC2026001",
        name: "Arjun Reddy",
        room: "A101",
        seat: "01",
        school_name: college1.name,
        exam_center: center1.name,
        class_name: "BCA 1st Year",
        college_id: college1.id,
        center_id: center1.id,
      },
      {
        rollno: "NVC2026002",
        name: "Sneha Patil",
        room: "A101",
        seat: "02",
        school_name: college1.name,
        exam_center: center1.name,
        class_name: "BCA 1st Year",
        college_id: college1.id,
        center_id: center1.id,
      },
      {
        rollno: "NVC2026003",
        name: "Mohit Kumar",
        room: "A102",
        seat: "05",
        school_name: college1.name,
        exam_center: center1.name,
        class_name: "BCom 2nd Year",
        college_id: college1.id,
        center_id: center1.id,
      },
      {
        rollno: "NVC2026004",
        name: "Pooja Singh",
        room: "B201",
        seat: "11",
        school_name: college1.name,
        exam_center: center1.name,
        class_name: "BCom 2nd Year",
        college_id: college1.id,
        center_id: center1.id,
      },
      {
        rollno: "SPC2026001",
        name: "Varun Shetty",
        room: "C101",
        seat: "03",
        school_name: college2.name,
        exam_center: center2.name,
        class_name: "PUC 2nd Year",
        college_id: college2.id,
        center_id: center2.id,
      },
      {
        rollno: "SPC2026002",
        name: "Isha Rao",
        room: "C101",
        seat: "04",
        school_name: college2.name,
        exam_center: center2.name,
        class_name: "PUC 2nd Year",
        college_id: college2.id,
        center_id: center2.id,
      },
      {
        rollno: "SPC2026003",
        name: "Naveen Hegde",
        room: "C102",
        seat: "09",
        school_name: college2.name,
        exam_center: center2.name,
        class_name: "PUC 1st Year",
        college_id: college2.id,
        center_id: center2.id,
      },
      {
        rollno: "SPC2026004",
        name: "Megha Joshi",
        room: "D201",
        seat: "14",
        school_name: college2.name,
        exam_center: center2.name,
        class_name: "PUC 1st Year",
        college_id: college2.id,
        center_id: center2.id,
      },
    ];
    for (const student of students) {
      await upsertStudent(client, student);
    }

    await upsertSetting(client, "exam_title", "Mock Semester Examination 2026");
    await upsertSetting(client, "exam_date", "2026-06-15");
    await upsertSetting(client, "exam_time", "10:00 AM - 01:00 PM");
    await upsertSetting(client, "board_session_name", "SeatSmart Demo Session");
    await upsertSetting(
      client,
      "default_student_portal_url",
      "https://seatsmart-psi.vercel.app/student/login",
    );

    await client.query("COMMIT");

    console.log("Dummy data seeded successfully.");
    console.log("- colleges: 2");
    console.log("- exam_centers: 2");
    console.log("- rooms: 6");
    console.log("- admins: 2");
    console.log("- students: 8");
    console.log("- settings: 5");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to seed dummy data:", error.message || error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();

