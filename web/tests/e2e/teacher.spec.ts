import { test, expect } from '@playwright/test';

test('teacher class management', async ({ page }) => {
    await page.goto('/auth');

    // Login
    await page.fill('input[type="email"]', 'teacher@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // Dashboard
    await expect(page).toHaveURL('/teacher');
    await expect(page.locator('text=Teacher Console')).toBeVisible();

    // Click Class
    await page.click('div:has-text("Manage Class")');
    await expect(page).toHaveURL(/\/teacher\/class\//);

    // Check Roster
    await expect(page.locator('text=Student Roster')).toBeVisible();

    // Freeze
    await page.click('button:has-text("Freeze Trading")');
    // Expect some UI change or toast (not implemented in UI detail yet but button exists)
});
