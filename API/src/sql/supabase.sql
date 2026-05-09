-- SeatSmart canonical schema (strict names + compatibility backfill)
-- Safe to run multiple times

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Colleges / Schools
CREATE TABLE IF NOT EXISTS colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  code text,
  type text NOT NULL DEFAULT 'school',
  contact_person text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE colleges
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Backfill from older columns if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'colleges' AND column_name = 'college_name'
  ) THEN
    EXECUTE 'UPDATE colleges SET name = COALESCE(name, college_name)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'colleges' AND column_name = 'college_code'
  ) THEN
    EXECUTE 'UPDATE colleges SET code = COALESCE(code, college_code)';
  END IF;
END $$;

-- Legacy compatibility: keep old columns optional so canonical writes succeed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'colleges' AND column_name = 'college_name'
  ) THEN
    EXECUTE 'ALTER TABLE colleges ALTER COLUMN college_name DROP NOT NULL';
  END IF;
END $$;

UPDATE colleges SET type = COALESCE(NULLIF(type, ''), 'school');
UPDATE colleges SET status = COALESCE(NULLIF(status, ''), 'active');
UPDATE colleges SET created_at = COALESCE(created_at, now());
UPDATE colleges SET updated_at = COALESCE(updated_at, now());

ALTER TABLE colleges
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'colleges_code_unique'
  ) THEN
    ALTER TABLE colleges ADD CONSTRAINT colleges_code_unique UNIQUE (code);
  END IF;
END $$;

-- Exam Centers
CREATE TABLE IF NOT EXISTS exam_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  code text,
  address text,
  city text,
  state text,
  total_rooms int NOT NULL DEFAULT 0,
  capacity int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exam_centers
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS total_rooms int,
  ADD COLUMN IF NOT EXISTS capacity int,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Optional compatibility/extension fields (kept if needed by existing data)
ALTER TABLE exam_centers
  ADD COLUMN IF NOT EXISTS college_id uuid,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS phone text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_centers' AND column_name = 'center_name'
  ) THEN
    EXECUTE 'UPDATE exam_centers SET name = COALESCE(name, center_name)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_centers' AND column_name = 'center_code'
  ) THEN
    EXECUTE 'UPDATE exam_centers SET code = COALESCE(code, center_code)';
  END IF;
END $$;

-- Legacy compatibility: keep old columns optional so canonical writes succeed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_centers' AND column_name = 'center_name'
  ) THEN
    EXECUTE 'ALTER TABLE exam_centers ALTER COLUMN center_name DROP NOT NULL';
  END IF;
END $$;

UPDATE exam_centers SET total_rooms = COALESCE(total_rooms, 0);
UPDATE exam_centers SET capacity = COALESCE(capacity, 0);
UPDATE exam_centers SET status = COALESCE(NULLIF(status, ''), 'active');
UPDATE exam_centers SET created_at = COALESCE(created_at, now());
UPDATE exam_centers SET updated_at = COALESCE(updated_at, now());

ALTER TABLE exam_centers
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN total_rooms SET NOT NULL,
  ALTER COLUMN capacity SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exam_centers_code_unique'
  ) THEN
    ALTER TABLE exam_centers ADD CONSTRAINT exam_centers_code_unique UNIQUE (code);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exam_centers_college_fk'
  ) THEN
    ALTER TABLE exam_centers
      ADD CONSTRAINT exam_centers_college_fk
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid,
  room_no text,
  floor text,
  capacity int,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS center_id uuid,
  ADD COLUMN IF NOT EXISTS room_no text,
  ADD COLUMN IF NOT EXISTS floor text,
  ADD COLUMN IF NOT EXISTS capacity int,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Optional compatibility field
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS block text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'exam_center_id'
  ) THEN
    EXECUTE 'UPDATE rooms SET center_id = COALESCE(center_id, exam_center_id)';
  END IF;
END $$;

-- Legacy compatibility: keep old columns optional so canonical writes succeed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'exam_center_id'
  ) THEN
    EXECUTE 'ALTER TABLE rooms ALTER COLUMN exam_center_id DROP NOT NULL';
  END IF;
END $$;

UPDATE rooms SET capacity = COALESCE(capacity, 0);
UPDATE rooms SET status = COALESCE(NULLIF(status, ''), 'active');
UPDATE rooms SET created_at = COALESCE(created_at, now());
UPDATE rooms SET updated_at = COALESCE(updated_at, now());

ALTER TABLE rooms
  ALTER COLUMN center_id SET NOT NULL,
  ALTER COLUMN room_no SET NOT NULL,
  ALTER COLUMN capacity SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rooms_center_fk'
  ) THEN
    ALTER TABLE rooms
      ADD CONSTRAINT rooms_center_fk
      FOREIGN KEY (center_id) REFERENCES exam_centers(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rooms_center_room_unique'
  ) THEN
    ALTER TABLE rooms
      ADD CONSTRAINT rooms_center_room_unique UNIQUE (center_id, room_no);
  END IF;
END $$;

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Admin management
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role text NOT NULL DEFAULT 'admin',
  status text NOT NULL DEFAULT 'active',
  assigned_college_ids jsonb,
  assigned_center_ids jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS assigned_college_ids jsonb,
  ADD COLUMN IF NOT EXISTS assigned_center_ids jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE admins SET role = COALESCE(NULLIF(role, ''), 'admin');
UPDATE admins SET status = COALESCE(NULLIF(status, ''), 'active');
UPDATE admins SET created_at = COALESCE(created_at, now());

ALTER TABLE admins
  ALTER COLUMN full_name SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admins_email_unique'
  ) THEN
    ALTER TABLE admins ADD CONSTRAINT admins_email_unique UNIQUE (email);
  END IF;
END $$;

-- Admin credentials (explicit table for admin auth visibility)
CREATE TABLE IF NOT EXISTS admin_credentials (
  key text PRIMARY KEY,
  email text NOT NULL,
  password text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill admin credentials from settings when available
DO $$
DECLARE
  v_email text;
  v_password text;
BEGIN
  SELECT value INTO v_email FROM settings WHERE key = 'admin_email' LIMIT 1;
  SELECT value INTO v_password FROM settings WHERE key = 'admin_password' LIMIT 1;

  IF COALESCE(v_email, '') <> '' AND COALESCE(v_password, '') <> '' THEN
    INSERT INTO admin_credentials (key, email, password, updated_at)
    VALUES ('primary', LOWER(v_email), v_password, now())
    ON CONFLICT (key)
    DO UPDATE
    SET email = EXCLUDED.email, password = EXCLUDED.password, updated_at = now();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION sync_admin_credentials_from_settings()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_email text;
  v_password text;
BEGIN
  SELECT value INTO v_email FROM settings WHERE key = 'admin_email' LIMIT 1;
  SELECT value INTO v_password FROM settings WHERE key = 'admin_password' LIMIT 1;

  IF COALESCE(v_email, '') <> '' AND COALESCE(v_password, '') <> '' THEN
    INSERT INTO admin_credentials (key, email, password, updated_at)
    VALUES ('primary', LOWER(v_email), v_password, now())
    ON CONFLICT (key)
    DO UPDATE
    SET email = EXCLUDED.email, password = EXCLUDED.password, updated_at = now();
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_admin_credentials_from_settings ON settings;
CREATE TRIGGER trg_sync_admin_credentials_from_settings
AFTER INSERT OR UPDATE ON settings
FOR EACH ROW
WHEN (NEW.key IN ('admin_email', 'admin_password'))
EXECUTE FUNCTION sync_admin_credentials_from_settings();

-- Students
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rollno text,
  name text,
  room text,
  seat text,
  school_name text,
  exam_center text,
  class_name text,
  college_id uuid,
  center_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS rollno text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS room text,
  ADD COLUMN IF NOT EXISTS seat text,
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS exam_center text,
  ADD COLUMN IF NOT EXISTS class_name text,
  ADD COLUMN IF NOT EXISTS college_id uuid,
  ADD COLUMN IF NOT EXISTS center_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Optional compatibility columns from old schema
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS exam_center_id uuid,
  ADD COLUMN IF NOT EXISTS room_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'exam_center_id'
  ) THEN
    EXECUTE 'UPDATE students SET center_id = COALESCE(center_id, exam_center_id)';
  END IF;
END $$;

UPDATE students SET created_at = COALESCE(created_at, now());
UPDATE students SET updated_at = COALESCE(updated_at, now());

ALTER TABLE students
  ALTER COLUMN rollno SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_college_fk'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_college_fk
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_center_fk'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_center_fk
      FOREIGN KEY (center_id) REFERENCES exam_centers(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_roll_center_unique'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_roll_center_unique UNIQUE (rollno, exam_center);
  END IF;
END $$;

-- Student profiles
CREATE TABLE IF NOT EXISTS student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  full_name text,
  rollno text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id uuid,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS rollno text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE student_profiles SET created_at = COALESCE(created_at, now());
ALTER TABLE student_profiles ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_auth_user_unique'
  ) THEN
    ALTER TABLE student_profiles
      ADD CONSTRAINT student_profiles_auth_user_unique UNIQUE (auth_user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_rollno ON students(rollno);
CREATE INDEX IF NOT EXISTS idx_students_exam_center ON students(exam_center);
CREATE INDEX IF NOT EXISTS idx_students_school_name ON students(school_name);
CREATE INDEX IF NOT EXISTS idx_students_class_name ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_college_id ON students(college_id);
CREATE INDEX IF NOT EXISTS idx_students_center_id ON students(center_id);

CREATE INDEX IF NOT EXISTS idx_colleges_name ON colleges(name);
CREATE INDEX IF NOT EXISTS idx_exam_centers_name ON exam_centers(name);
CREATE INDEX IF NOT EXISTS idx_rooms_room_no ON rooms(room_no);

CREATE INDEX IF NOT EXISTS idx_rooms_center_id ON rooms(center_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_auth_user_id ON student_profiles(auth_user_id);

-- RLS hardening for student-facing tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_profiles'
      AND policyname = 'student_profiles_self_select'
  ) THEN
    CREATE POLICY student_profiles_self_select
      ON student_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = auth_user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_profiles'
      AND policyname = 'student_profiles_self_insert'
  ) THEN
    CREATE POLICY student_profiles_self_insert
      ON student_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = auth_user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_profiles'
      AND policyname = 'student_profiles_self_update'
  ) THEN
    CREATE POLICY student_profiles_self_update
      ON student_profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = auth_user_id)
      WITH CHECK (auth.uid() = auth_user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'students'
      AND policyname = 'students_read_by_linked_profile'
  ) THEN
    CREATE POLICY students_read_by_linked_profile
      ON students
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM student_profiles sp
          WHERE sp.auth_user_id = auth.uid()
            AND LOWER(sp.rollno) = LOWER(students.rollno)
        )
      );
  END IF;
END $$;
