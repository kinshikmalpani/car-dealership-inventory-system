import { defineConfig, devices } from "@playwright/test";

const python =
  process.platform === "win32"
    ? '".venv\\Scripts\\python.exe"'
    : ".venv/bin/python";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [["list"], ["junit", { outputFile: "../docs/browser-tests.xml" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1050 },
      },
    },
  ],
  webServer: process.env.E2E_EXTERNAL_SERVERS
    ? undefined
    : [
        {
          command: `${python} e2e_server.py`,
          cwd: "../backend",
          url: "http://127.0.0.1:8000/api/health",
          reuseExistingServer: false,
          timeout: 60_000,
        },
        {
          command: "npm run dev -- --port 5173 --strictPort",
          url: "http://127.0.0.1:5173",
          reuseExistingServer: false,
          timeout: 60_000,
        },
      ],
});
