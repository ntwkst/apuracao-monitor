import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages: https://ntwkst.github.io/apuracao-monitor/
  base: process.env.VITE_BASE ?? "/apuracao-monitor/",
  server: {
    port: 5177,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
