# SeatSmart Go-Live UAT Checklist

Use this checklist before every production release.

## Environment & Config
- [ ] `API/.env` has production `DATABASE_URL`/`DIRECT_URL`
- [ ] `API/.env` has `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
- [ ] `Web` env has production `NEXT_PUBLIC_API_BASE_URL`
- [ ] `Web` env has production `NEXT_PUBLIC_WEB_URL`
- [ ] Supabase `Site URL` is set to production web URL
- [ ] Supabase `Additional Redirect URLs` include:
  - `/student/reset-password` (prod + localhost/dev as needed)
- [ ] Custom SMTP is configured in Supabase Auth

## Admin Panel Flow
- [ ] Admin login works with env credentials
- [ ] Dashboard loads real counts
- [ ] Schools/Colleges CRUD works
- [ ] Exam Centers CRUD works
- [ ] Rooms CRUD works
- [ ] Students CRUD works
- [ ] Upload CSV works with preview + invalid row handling
- [ ] QR generation page works
- [ ] Admin `/admin/health` page is all green

## Student Flow
- [ ] Student signup works
- [ ] Student sign in works
- [ ] Forgot password sends email
- [ ] Password reset link opens reset page correctly
- [ ] Password update works and login with new password works
- [ ] Student seat lookup by roll no works
- [ ] QR-based center query lookup works

## Mobile & Network
- [ ] QR scanned from mobile opens reachable URL (not localhost)
- [ ] Student portal works on same Wi-Fi/LAN
- [ ] No CORS errors in API requests

## Backup & Restore Safety
- [ ] `npm run backup:students` completes successfully
- [ ] `npm run backup:verify` passes
- [ ] Latest backup file exists in `API/backups/`
- [ ] Daily GitHub backup workflow succeeded (if enabled)

## Final Acceptance
- [ ] API build/start pass
- [ ] Web build compiles without code errors
- [ ] No blocking errors in browser console
- [ ] All critical user journeys are verified end-to-end
