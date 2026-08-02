# LumoraClear Admin

Internal admin site for LumoraClear: a read-only database browser and a
read/write color-scheme editor, styled to match the mobile/web app's design
system.

- `backend/` — Express API, connects to Supabase via the server-side
  `@supabase/supabase-js` client (using the `service_role`/secret key, which
  bypasses RLS). Login checks email + password against `users` directly and
  only lets `role` `Admin`/`Developer` accounts in.
- `frontend/` — Vite + React + TypeScript SPA. Talks only to the backend API,
  never to Supabase directly.

## Setup

**Backend**

```
cd backend
cp .env.example .env
# fill in SUPABASE_URL + SUPABASE_SECRET_KEY (Supabase dashboard -> Project
# Settings -> Data API / API Keys) and SESSION_SECRET
npm install
npm run dev   # http://localhost:4000
```

`SUPABASE_SECRET_KEY` is the `service_role` key — it bypasses Row Level
Security, so it must only ever live in `backend/.env` (gitignored), never in
the frontend or a committed file.

**Frontend**

```
cd frontend
cp .env.example .env   # defaults already point at localhost:4000
npm install
npm run dev   # http://localhost:5173
```

Log in with an existing LumoraClear account whose `role` is `Admin` or
`Developer` — any other role (or wrong credentials) is rejected.

## Pages

- **Database** (`/database`, read-only) — pick a table from the sidebar to
  see its column metadata (type, nullable, FK target) and a paginated view of
  its live rows. Table list is defined in `backend/src/schema/tables.js`,
  mirroring `backend/models/*.js` in the main LumoraClear repo — update it by
  hand if a model changes.
- **Color Scheme** (`/colors`, read/write) — edit the `theme_colors` table
  (light/dark) with hex inputs + native color pickers and a live preview,
  same table the app reads via `GET /theme/colors`.

## Notes

- All table names queried by the backend come from a fixed whitelist
  (`TABLES` in `backend/src/schema/tables.js`) — the `:key` route param is
  looked up against it, never passed straight into `supabase.from()`.
- Login hashes the typed email with the same `sha256(lowercase+trim)` scheme
  the main backend uses for `email_hash` (the only way to find a user, since
  email is stored encrypted), then checks the password with `bcryptjs`
  against `passwordHash`. Social-login-only accounts (`passwordHash` null)
  can't log in here. This is a session cookie per browser, not a JWT — fine
  for this internal tool's scale.
- `npm audit` flags `react-router-dom` and `esbuild`/`vite` dev-server
  advisories; neither applies here (no SSR/RSC/data-router usage, and the
  esbuild issue only affects `vite dev`, not the built app) — revisit if that
  changes.
