import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["packages/*/src/**/*.test.ts", "content/**/*.test.ts", "apps/web/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});
