export const STUDENTS_TABLE = "students";

export const UPLOAD_REQUIRED_HEADERS = [
  "Roll No",
  "Student Name",
  "Room No",
  "Seat No",
  "School",
  "Center",
  "Class",
];

function getValueByKeys(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }

  const lowerMap = Object.keys(row).reduce((acc, rawKey) => {
    acc[String(rawKey).trim().toLowerCase()] = row[rawKey];
    return acc;
  }, {});

  for (const key of keys) {
    const value = lowerMap[String(key).trim().toLowerCase()];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

export function normalizeUploadRow(row) {
  return {
    rollno: getValueByKeys(row, ["Roll No", "rollno", "roll_no", "RollNo"]),
    name: getValueByKeys(row, ["Student Name", "name", "student_name", "Name"]),
    room: getValueByKeys(row, ["Room No", "room", "room_no", "Room"]),
    seat: getValueByKeys(row, ["Seat No", "seat", "seat_no", "Seat"]),
    school_name: getValueByKeys(row, ["School", "school_name", "school", "School Name"]),
    exam_center: getValueByKeys(row, ["Center", "exam_center", "center", "Exam Center"]),
    class_name: getValueByKeys(row, ["Class", "class_name", "class", "Class Name"]),
  };
}

export function validateStudentRow(student) {
  const missing = [];
  if (!student.rollno) missing.push("rollno");
  if (!student.name) missing.push("name");
  if (!student.room) missing.push("room");
  if (!student.seat) missing.push("seat");
  if (!student.school_name) missing.push("school_name");
  if (!student.exam_center) missing.push("exam_center");
  if (!student.class_name) missing.push("class_name");
  return missing;
}

export function toCsv(rows) {
  const headers = [
    "Roll No",
    "Student Name",
    "Class",
    "School",
    "Center",
    "Room No",
    "Seat No",
  ];

  const lines = rows.map((row) =>
    [
      row.rollno || "",
      row.name || "",
      row.class_name || "",
      row.school_name || "",
      row.exam_center || "",
      row.room || "",
      row.seat || "",
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",")
  );

  return [headers.join(","), ...lines].join("\n");
}

export function getFriendlySupabaseError(error, fallbackMessage) {
  if (!error) return fallbackMessage;
  if (error.message) return error.message;
  return fallbackMessage;
}
