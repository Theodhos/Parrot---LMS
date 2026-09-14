import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  // Dev mode (Turbopack) compiles each route on first hit, which can
  // comfortably exceed Playwright's 5s default expect timeout the first
  // time a given page is visited in a run. `next build && next start`
  // wouldn't have this cost -- this is a dev-mode-only accommodation.
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3010",
    trace: "on-first-retry",
    navigationTimeout: 20_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Port 3000 isn't assumed free -- pin explicitly and match .env's
    // NEXTAUTH_URL so Auth.js's own URL handling stays consistent.
    command: "npm run dev -- -p 3010",
    url: "http://localhost:3010",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
