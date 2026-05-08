create extension if not exists pgcrypto;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  rollno text not null,
  name text not null,
  room text not null,
  seat text not null,
  school_name text not null,
  exam_center text not null,
  class_name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists students_rollno_idx on public.students (rollno);
create index if not exists students_exam_center_idx on public.students (exam_center);
create unique index if not exists students_rollno_center_uniq
on public.students (rollno, exam_center);
