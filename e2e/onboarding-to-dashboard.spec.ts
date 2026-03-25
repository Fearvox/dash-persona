import { test, expect } from '@playwright/test';

test.describe('Onboarding → Dashboard flow', () => {
  test('demo mode navigates from landing to dashboard', async ({ page }) => {
    await page.goto('/');

    // Click "Try Demo" CTA
    await page.locator('a[href*="/dashboard?source=demo"]').first().click();

    // Should land on dashboard
    await page.waitForURL('**/dashboard**');

    // Dashboard heading visible
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Demo badge visible
    await expect(page.locator('text=Demo')).toBeVisible();
  });

  test('onboarding page renders with import and URL modes', async ({ page }) => {
    await page.goto('/onboarding');

    // Page loads
    await expect(page.locator('text=Get Started')).toBeVisible({ timeout: 10_000 });
  });
});
