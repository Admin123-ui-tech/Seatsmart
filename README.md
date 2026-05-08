# SeatSmart

SeatSmart is an exam seating plan system for schools/colleges and exam centers.

Core flow:
1. Admin uploads student seating data.
2. Data is stored in Supabase (Postgres).
3. Admin generates center QR codes.
4. Student scans QR and enters roll number.
5. Student instantly sees seat details.

This repository is split into:
- `API/` -> backend (Node.js + Postgres/Supabase)
- `Web/` -> frontend (Next.js + Supabase Auth for students)

## Tech Stack

- Backend: Node.js, `pg`
- Frontend: Next.js App Router, React
- Auth:
  - Admin: fixed env credentials via API
  - Student: Supabase Auth
- Database: Supabase Postgres

## Project Structure

```text
seatsmart/
  API/
    src/
      index.js
      sql/
        supabase.sql
    .env.example
    package.json
  Web/
    app/
    components/
    lib/
    public/
    .env.example
    package.json
  README.md
  .gitignore
```

## Environment Setup

### API env (`API/.env`)

```env
PORT=4000
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strong_password
ADMIN_SESSION_SECRET=replace_with_long_random_secret
API_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
WEB_BASE_URL=http://localhost:3000
FRONTEND_URL=https://yourdomain.com
ADMIN_LOGIN_RATE_LIMIT_MAX=20
STUDENT_SEAT_RATE_LIMIT_MAX=60
STUDENT_PROFILE_UPSERT_RATE_LIMIT_MAX=20
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Optional: Supabase auth automation (site URL + SMTP)
SUPABASE_ACCESS_TOKEN=<supabase_management_pat>
SUPABASE_PROJECT_REF=<project_ref>
SUPABASE_SITE_URL=https://yourdomain.com
SUPABASE_ADDITIONAL_REDIRECT_URLS=https://yourdomain.com/student/reset-password,http://localhost:3000/student/reset-password
SUPABASE_SMTP_ADMIN_EMAIL=no-reply@yourdomain.com
SUPABASE_SMTP_HOST=smtp.yourdomain.com
SUPABASE_SMTP_PORT=587
SUPABASE_SMTP_USER=...
SUPABASE_SMTP_PASS=...
SUPABASE_SMTP_SENDER_NAME=SeatSmart
SUPABASE_SMTP_MAX_FREQUENCY=60
```

Notes:
- Use at least one DB URL: `DATABASE_URL` or `DIRECT_URL`.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` are required for admin login.
- Admin session is cookie-based (`HttpOnly`, `SameSite=Lax`) and signed using `ADMIN_SESSION_SECRET`.
- Rate limits can be tuned using the three `*_RATE_LIMIT_MAX` variables.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are required for student-token validation on API routes.
- Supabase SMTP/domain keys are optional and used by `npm run configure:supabase-auth`.

### Web env (`Web/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

Notes:
- Do not hardcode keys in source code.
- `NEXT_PUBLIC_API_URL` must point to the running API.
- For mobile/LAN testing, use your PC LAN IP instead of `localhost`.

## Database and Migrations

Canonical schema files:
- `API/supabase.sql`
- `API/src/sql/supabase.sql`

How it works:
- API startup runs this SQL automatically (`runMigrations()` in `API/src/index.js`).
- SQL is idempotent (safe to run multiple times).
- Includes compatibility backfills from older column names.

Main tables:
- `students`
- `colleges`
- `exam_centers`
- `rooms`
- `settings`
- `student_profiles`

Important `students` mapping:
- `Roll No` -> `rollno`
- `Student Name` -> `name`
- `Room No` -> `room`
- `Seat No` -> `seat`
- `School` -> `school_name`
- `Center` -> `exam_center`
- `Class` -> `class_name`

## Install and Run Locally

Open two terminals.

### Terminal 1: API

```bash
cd d:\ExamCentre\ExamCentre\seatsmart\API
npm install
npm run dev
```

API health check:
- `GET http://localhost:4000/health`

### Terminal 2: Web

```bash
cd d:\ExamCentre\ExamCentre\seatsmart\Web
npm install
npm run dev
```

Web URL:
- `http://localhost:3000`

Admin health page:
- `http://localhost:3000/admin/health`

## Build Commands

### API

```bash
cd d:\ExamCentre\ExamCentre\seatsmart\API
npm run build
npm run start
```

### Web

```bash
cd d:\ExamCentre\ExamCentre\seatsmart\Web
npm run typecheck
npm run lint
npm run build
npm run start
```

## Routes

### Entry
- `/` -> landing page (Admin Panel / Student Panel)

### Admin
- `/admin/login`
- `/admin/dashboard`
- `/admin/colleges`
- `/admin/upload`
- `/admin/students`
- `/admin/seating`
- `/admin/qrcodes`
- `/admin/centers`
- `/admin/rooms`
- `/admin/settings`

Legacy aliases:
- `/admin/seating-plan` -> `/admin/seating`
- `/admin/qr-codes` -> `/admin/qrcodes`

### Student
- `/student/login`
- `/student/signup`
- `/student/forgot-password`
- `/student` (protected seat lookup)

Legacy alias:
- `/seat` -> `/student`

## Auth Model

### Admin auth (env-based)
- Admin credentials are checked by API (`/api/admin/login`).
- No admin password is stored in DB.
- Session is cookie-based (signed, `HttpOnly`), not stored as a bearer token in browser storage.

### Student auth (Supabase Auth)
- Signup/login/forgot password are handled via Supabase Auth.
- Extra profile data is synced to `student_profiles`.

## API Overview

Health:
- `GET /health`
- `GET /api/system/health` (admin session required)

Admin auth:
- `POST /api/admin/login`
- `GET /api/admin/session`
- `POST /api/admin/logout`

Dashboard:
- `GET /api/dashboard` (admin session required)

CRUD:
- Colleges: `/api/colleges`, `/api/colleges/create|update|delete` (admin session required)
- Exam Centers: `/api/exam-centers`, `/api/exam-centers/create|update|delete` (admin session required)
- Rooms: `/api/rooms`, `/api/rooms/create|update|delete` (admin session required)
- Students: `/api/students`, `/api/students/options`, `/api/students/create|update|delete|upload` (admin session required)

Seat lookup:
- `GET /api/student-seat?rollno=<rollno>&center=<centerName>`
- Also supports `centerId`.
- Requires student session token + server-side rate limiting.

Settings:
- `GET /api/settings`
- `POST /api/settings/upsert`

Compatibility endpoint:
- `GET /api/centers` (legacy center summary fallback)

## Upload Format

Accepted files:
- `.csv`, `.xlsx`, `.xls`

Required columns:
- `Roll No`
- `Student Name`
- `Room No`
- `Seat No`
- `School`
- `Center`
- `Class`

Upload behavior:
- Preview before upload
- Invalid row detection
- Duplicate roll detection by `rollno + exam_center`
- Server-side dedupe while inserting

## QR Code Behavior

Generated links use:
- `/student?center=<exam_center>`

Compatibility:
- Student lookup also supports `centerId`.
- If `exam_centers` master data is empty, QR module can fallback to distinct centers from uploaded student data.

## Deployment

### Deploy API

Deploy `API/` to Render, Railway, Fly.io, VPS, etc.

Build/start:
```bash
npm install
npm run build
npm run start
```

Required envs:
- `DATABASE_URL` or `DIRECT_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `PORT` (platform-managed on many hosts)

### Deploy Web

Deploy `Web/` to Vercel (recommended) or any Node host.

Build/start:
```bash
npm install
npm run build
npm run start
```

Required envs:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (production API URL)

## Troubleshooting

`Missing DATABASE_URL (or DIRECT_URL) in API environment`:
- Add DB URL in `API/.env`.

`Admin credentials are not configured on the API server`:
- Add `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `API/.env`.

`Invalid API key` (student auth):
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `Web/.env.local`.

`Email rate limit exceeded` (student signup):
- Wait a few minutes, then use Student Sign In.
- This is Supabase Auth rate limiting behavior.

Forgot password opens `localhost` on mobile:
- Set `NEXT_PUBLIC_SITE_URL` to your LAN/production URL.
- In Supabase Auth URL configuration, add:
  - `http://<lan-ip>:3000/student/reset-password`
  - `http://localhost:3000/student/reset-password`

Reset email rate limit hit:
- SeatSmart now includes a 60-second resend cooldown in the forgot-password page.
- For production reliability, configure custom SMTP.

## Ops Helpers

Backup students CSV:
```bash
cd d:\ExamCentre\ExamCentre\seatsmart\API
npm run backup:students
```
Output is saved under `API/backups/`.

Verify restore (dry-run, no live data mutation):
```bash
cd d:\ExamCentre\ExamCentre\seatsmart\API
npm run backup:verify
```

Configure Supabase auth site URL + SMTP (optional):
```bash
cd d:\ExamCentre\ExamCentre\seatsmart\API
npm run configure:supabase-auth
```
Requires `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, and `SUPABASE_SITE_URL` in `API/.env`.
Optional: `SUPABASE_ADDITIONAL_REDIRECT_URLS` as comma-separated URLs.

Daily automation:
- GitHub Actions workflow: `.github/workflows/daily-backup-verify.yml`
- Add repo secrets: `DATABASE_URL` (or `DIRECT_URL`)

Go-live UAT:
- Checklist: `docs/UAT_CHECKLIST.md`

Windows build `EPERM` on `.next`:
- Close running dev processes/IDEs locking files.
- Run terminal as Administrator if required.
- Retry `npm run build`.

## Production Notes

- Keep `.env` files private.
- Do not commit real Supabase keys/passwords.
- Use HTTPS in production for API and Web.
- Keep Supabase RLS/policies aligned with your auth model.

## License

Private project (internal use).
