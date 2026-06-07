import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In dev the browser talks to the frontend origin only; these proxies forward
// API + health calls to the Express backend (default :4000) so requests are
// same-origin (no CORS, and SSE in Step 27 rides the same path). In production
// set VITE_API_BASE to the API origin instead of relying on the proxy. (DECISIONS 024)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      "/health": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
