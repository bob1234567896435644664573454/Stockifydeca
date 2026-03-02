import { test, expect } from '@playwright/test';

test('student trade flow', async ({ page }) => {
    // Mock API or use real backend? "Connects to existing Supabase backend" implies real backend.
    // But for CI we usually mock. For local verification we use real.
    // We'll assume local dev server is running.

    await page.goto('/auth');

    // Login
    await page.fill('input[type="email"]', 'student@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // Dashboard
    await expect(page).toHaveURL('/student');
    await expect(page.locator('text=Total Equity')).toBeVisible();

    // Navigate to Trade
    await page.click('button:has-text("Trade")'); // Redirects to AAPL
    await expect(page).toHaveURL(/\/student\/trade\/AAPL/);

    // Check Chart
    await expect(page.locator('iframe')).toBeVisible();

    // Place Order
    await page.fill('input[name="qty"]', '1');
    await page.click('button:has-text("Place BUY Order")');

    // Verify Success
    await expect(page.locator('text=Order placed')).toBeVisible();
});
