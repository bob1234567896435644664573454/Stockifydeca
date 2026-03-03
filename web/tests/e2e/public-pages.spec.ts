/**
 * Playwright E2E smoke tests for all public pages.
 * Run with: npx playwright test tests/e2e/
 */
import { test, expect } from "@playwright/test"

const BASE = process.env.BASE_URL || "http://localhost:8080"

const PUBLIC_ROUTES = [
  { path: "/", title: "Stockify", heading: "Stockify" },
  { path: "/about", title: "About", heading: "About" },
  { path: "/features", title: "Features", heading: "Feature" },
  { path: "/pricing", title: "Pricing", heading: "Pricing" },
  { path: "/resources", title: "Resources", heading: "Resource" },
  { path: "/privacy", title: "Privacy", heading: "Privacy" },
  { path: "/terms", title: "Terms", heading: "Terms" },
  { path: "/auth", title: "Auth", heading: "Sign" },
]

for (const route of PUBLIC_ROUTES) {
  test(`${route.path} loads and renders heading`, async ({ page }) => {
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" })

    // Page should not show a blank screen
    const body = await page.textContent("body")
    expect(body?.length).toBeGreaterThan(50)

    // Should contain the expected heading text somewhere
    const content = await page.content()
    expect(content.toLowerCase()).toContain(route.heading.toLowerCase())
  })
}

test("404 page renders for unknown route", async ({ page }) => {
  await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: "networkidle" })
  const body = await page.textContent("body")
  expect(body).toContain("404")
})
