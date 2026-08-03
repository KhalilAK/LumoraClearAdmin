import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Mirrors the vercel.json rewrite used in production: keeps API calls
    // same-origin (relative /api/... paths) so the session cookie is
    // first-party instead of cross-site, in dev too.
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
