import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './src/tests',
    timeout: 30_000,
    retries: 0,
    workers: 1,
    use: {
        baseURL: 'http://localhost:5174',
        headless: true,
    },
    webServer: {
        command: 'npm run dev -- --port 5174',
        port: 5174,
        reuseExistingServer: true,
        timeout: 60_000,
    },
});
