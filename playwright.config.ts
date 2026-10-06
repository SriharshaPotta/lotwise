import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build (`npm run build` first).
 * Projects cover Chromium, Firefox and WebKit at 390, 768 and 1440px. Run one browser with
 * `npx playwright test --project='chromium-*'`. In a container with a preinstalled Chromium, point
 * PW_CHROMIUM_PATH at it instead of downloading browsers.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const chromiumPath = process.env.PW_CHROMIUM_PATH;

const SIZES = [
  { name: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: "768", viewport: { width: 768, height: 1024 }, isMobile: false, hasTouch: true },
  { name: "1440", viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
] as const;

const BROWSERS = [
  { name: "chromium", device: devices["Desktop Chrome"] },
  { name: "firefox", device: devices["Desktop Firefox"] },
  { name: "webkit", device: devices["Desktop Safari"] },
] as const;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: BROWSERS.flatMap((b) =>
    SIZES.map((s) => ({
      name: `${b.name}-${s.name}`,
      use: {
        ...b.device,
        viewport: s.viewport,
        // Firefox doesn't support isMobile; touch is enough to exercise the phone layout.
        ...(b.name === "firefox" ? {} : { isMobile: s.isMobile }),
        hasTouch: s.hasTouch,
        ...(b.name === "chromium" && chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
      },
    })),
  ),
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
