import { defineConfig } from "vitest/config";
export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify("2026-11-17T19:35:00.000Z"),
    __BUILD_VERSION__: JSON.stringify("20261117193500"),
  },
  test: {
    environment: "node",
    env: { TZ: "America/Toronto" },
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: "forks",
    maxWorkers: 1,
    minWorkers: 1,
  },
});
