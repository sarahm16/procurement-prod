import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// In development the portal runs on :5175 and forwards every /api request
// to the server on :3001. The browser only ever talks to :5175, so the
// sign-in cookie works as if the portal and server were one site.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
