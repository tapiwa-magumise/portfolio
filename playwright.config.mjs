import { defineConfig, devices } from '@playwright/test';

// The site is static files, so a plain file server is all the tests need
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: 'http://localhost:8766', trace: 'retain-on-failure' },
  webServer: { command: 'python3 -m http.server 8766', port: 8766, reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } }
  ]
});
