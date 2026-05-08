# SeatSmart Deployment Guide

This project is a **separate frontend + backend** setup:
- `Web/` -> Next.js frontend (deploy to Vercel)
- `API/` -> Node.js backend (deploy to Render)
- Supabase -> database + student auth

## 1) Supabase Setup

### Run SQL schema
1. Open Supabase project -> SQL Editor.
2. Run the file: `API/supabase.sql` (same as canonical `API/src/sql/supabase.sql`).
3. Confirm tables exist:
   - `students`
   - `colleges`
   - `exam_centers`
   - `rooms`
   - `settings`
   - `student_profiles`

### Auth URL configuration
In Supabase -> Authentication -> URL Configuration:
1. Set Site URL to your Vercel domain (example: `https://your-app.vercel.app`).
2. Add redirect URLs:
   - `https://your-app.vercel.app/student/reset-password`
   - `http://localhost:3000/student/reset-password` (dev)

### Copy keys
From Supabase project settings:
1. `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
2. `anon key` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
3. `service_role key` -> `SUPABASE_SERVICE_ROLE_KEY` (backend secret only)

## 2) Deploy Frontend to Vercel

### Import project
1. Create new Vercel project from this repo.
2. Set **Root Directory** to: `Web`

### Build settings
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave default (Next.js)

### Required Vercel env vars
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` = Render API URL (example `https://seatsmart-api.onrender.com`)
- `NEXT_PUBLIC_SITE_URL` = Vercel frontend URL

### Deploy
1. Trigger deployment.
2. Verify routes:
   - `/`
   - `/admin/login`
   - `/admin/dashboard`
   - `/student`
   - `/student/login`
   - `/student/signup`
   - `/student/forgot-password`

## 3) Deploy Backend to Render

### Option A: render.yaml (recommended)
Render can use repository `render.yaml` directly.

### Option B: manual service setup
1. Create new **Web Service** from this repo.
2. Set **Root Directory**: `API`
3. Runtime: Node

### Build/start settings
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check path: `/health`

### Required Render env vars
- `PORT` = `8080`
- `DATABASE_URL` (or `DIRECT_URL`)
- `FRONTEND_URL` = Vercel frontend URL
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Optional:
- `API_ALLOWED_ORIGINS` (comma-separated)
- `WEB_BASE_URL`
- Rate-limit vars (`ADMIN_LOGIN_RATE_LIMIT_MAX`, etc.)

## 4) Local Environment Templates

Frontend template: `Web/.env.example`
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SITE_URL=
```

Backend template: `API/.env.example`
```env
PORT=8080
FRONTEND_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

## 5) Verification Checklist

- [ ] Supabase SQL applied successfully
- [ ] All required tables exist
- [ ] Frontend `npm run build` passed
- [ ] Backend `npm run build` passed
- [ ] Admin login works (env-based)
- [ ] Student signup works
- [ ] Student login works
- [ ] Forgot password works
- [ ] CSV upload works
- [ ] QR generation works
- [ ] QR -> student seat lookup works
- [ ] Vercel env vars configured
- [ ] Render env vars configured

