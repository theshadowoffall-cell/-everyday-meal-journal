import { defineConfig } from "vite";

const builtAt = new Date().toISOString();
// A UTC timestamp makes every build identifiable without a manual version bump.
const buildVersion = builtAt.slice(0, 19).replace(/[-:T]/g, "");
export default defineConfig({
  base: "./",
  define: {
    __BUILD_TIME__: JSON.stringify(builtAt),
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
});
