import { defineConfig, devices } from "@playwright/test";

const PORT = 3210;
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `PERCEPTRON_SECRET=e2e-test-secret PORT=${PORT} npm run start`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
