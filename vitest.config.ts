import { defineConfig } from "vitest/config";
export default defineConfig({
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
