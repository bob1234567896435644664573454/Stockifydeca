import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
    test.setTimeout(120_000);

    test('Login - Student', async ({ page }) => {
        // Mock the auth token request
        await page.route('**/auth/v1/token?grant_type=password', async route => {
            const json = {
                access_token: "mock_access_token",
                token_type: "bearer",
                expires_in: 3600,
                refresh_token: "mock_refresh_token",
                user: {
                    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    aud: "authenticated",
                    role: "authenticated",
                    email: "student1@stockify.dev",
                    app_metadata: { provider: "email", providers: ["email"], role: "student" },
                    user_metadata: { display_name: "Alex Student" },
                    created_at: "2023-01-01T00:00:00.000Z",
                    updated_at: "2023-01-01T00:00:00.000Z"
                }
            };
            await route.fulfill({ json });
        });

        // Mock account data for dashboard
        await page.route('**/rest/v1/trading_accounts*', async route => {
            await route.fulfill({
                json: [{
                    id: "44444444-4444-4444-4444-444444444441",
                    user_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    cash_balance: 100000,
                    status: 'active'
                }]
            });
        });

        await page.goto('/auth', { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await page.fill('input[type="email"]', 'student1@stockify.dev');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button[type="submit"]');

        // Expect redirect to student dashboard
        await expect(page).toHaveURL(/\/student/);
    });

    test('Login - Teacher', async ({ page }) => {
        // Mock the auth token request
        await page.route('**/auth/v1/token?grant_type=password', async route => {
            const json = {
                access_token: "mock_teacher_token",
                token_type: "bearer",
                expires_in: 3600,
                refresh_token: "mock_refresh_token",
                user: {
                    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    aud: "authenticated",
                    role: "authenticated",
                    email: "teacher@stockify.dev",
                    app_metadata: { provider: "email", providers: ["email"], role: "teacher" },
                    user_metadata: { display_name: "Ms. Rivera" },
                    created_at: "2023-01-01T00:00:00.000Z",
                    updated_at: "2023-01-01T00:00:00.000Z"
                }
            };
            await route.fulfill({ json });
        });

        // Mock teacher classes
        await page.route('**/functions/v1/class*', async route => {
            await route.fulfill({ json: { classes: [] } });
        });

        await page.goto('/auth', { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await page.fill('input[type="email"]', 'teacher@stockify.dev');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button[type="submit"]');

        // Expect redirect to teacher dashboard
        await expect(page).toHaveURL(/\/teacher/);
    });
});
