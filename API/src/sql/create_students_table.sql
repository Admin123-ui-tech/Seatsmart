create extension if not exists pgcrypto;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  rollno text not null,
  enrollment_number text,
  name text not null,
  room text not null,
  seat text not null,
  school_name text not null,
  exam_center text not null,
  exam_center_code text,
  exam_date date,
  exam_shift text,
  dob date,
  class_name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists students_rollno_idx on public.students (rollno);
create index if not exists students_enrollment_number_idx on public.students (enrollment_number);
create index if not exists students_exam_center_code_idx on public.students (exam_center_code);
create index if not exists students_exam_center_idx on public.students (exam_center);
create index if not exists students_exam_date_idx on public.students (exam_date);
create unique index if not exists students_rollno_center_uniq
on public.students (rollno, exam_center);
