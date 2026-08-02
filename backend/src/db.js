import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.warn(
    "[db] SUPABASE_URL / SUPABASE_SECRET_KEY are not set — API requests that touch the database will fail. Copy backend/.env.example to backend/.env and fill it in."
  );
}

// Server-side client using the secret (service_role) key — bypasses RLS, so
// this must only ever run on the backend, never be sent to the frontend.
// Falls back to placeholder strings when unset so the server can still boot;
// any actual query then fails per-request with a clear 502 instead of a hard
// crash at startup.
export const supabase = createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SECRET_KEY || "placeholder-key",
  { auth: { persistSession: false } }
);
