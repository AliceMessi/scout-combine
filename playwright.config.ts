import { defineConfig } from '@playwright/test'

// Tests run against the production build (npm run build first), like the booth.
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.ts',
  timeout: 90_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5181/', viewport: { width: 1600, height: 900 } },
  webServer: { command: 'npx vite preview --port 5181 --strictPort', url: 'http://localhost:5181/', reuseExistingServer: false },
})
