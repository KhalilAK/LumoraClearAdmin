import { Skeleton } from "./Skeleton";

// Shown while the initial session check (GET /api/auth/me) is in flight —
// mirrors Login.tsx's actual field layout so it doesn't jump/reflow once the
// real form (or a redirect) takes over. No logo/spinner here on purpose —
// just the shapes, per the site's usual skeleton pattern.
export function LoginSkeleton() {
  return (
    <div className="login-shell">
      <div className="card login-card">
        <Skeleton height={24} width="65%" style={{ margin: "0 auto 24px" }} />

        <Skeleton height={12} width="20%" style={{ marginBottom: 6 }} />
        <Skeleton height={40} style={{ marginBottom: 16 }} />

        <Skeleton height={12} width="30%" style={{ marginBottom: 6 }} />
        <Skeleton height={40} style={{ marginBottom: 16 }} />

        <Skeleton height={40} />
      </div>
    </div>
  );
}
