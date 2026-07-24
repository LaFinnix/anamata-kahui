/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**/*.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist"],
    css: false,
    environmentMatchGlobs: [
      // Tests that don't need jsdom (pure node-level logic).
      ["src/lib/auth/safe-redirect.test.ts", "node"],
      ["src/lib/supabase/check-read-status.test.ts", "node"],
    ],
  },
});
