import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests only. The Playwright e2e suite under e2e/ is run separately via
// the test:e2e scripts and must not be picked up by vitest.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` is a Next.js build-time marker package with no vitest
      // resolution; alias it to an empty stub so any server module imports
      // cleanly in tests (replaces ad-hoc per-test vi.mock("server-only")).
      "server-only": fileURLToPath(new URL("./vitest.stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
