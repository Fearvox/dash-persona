import { test, expect } from '@playwright/test';

test.describe('Dashboard page (demo mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?source=demo&persona=tutorial');
  });

  test('renders dashboard header with persona type', async ({ page }) => {
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=tutorial')).toBeVisible();
  });

  test('renders Growth Overview section', async ({ page }) => {
    const growthSection = page.locator('[aria-labelledby="growth-heading"]');
    await expect(growthSection).toBeVisible();
    await expect(page.locator('#growth-heading')).toHaveText('Growth Overview');
  });

  test('renders Cross-Platform Comparison section', async ({ page }) => {
    const platformsSection = page.locator('[aria-labelledby="platforms-heading"]');
    await expect(platformsSection).toBeVisible();
    await expect(page.locator('#platforms-heading')).toHaveText(
      'Cross-Platform Comparison',
    );
  });

  test('renders Strategy Suggestions in sidebar', async ({ page }) => {
    await expect(page.locator('#strategy-heading')).toHaveText(
      'Strategy Suggestions',
    );
  });

  test('renders Quick Links with navigation cards', async ({ page }) => {
    const quickLinks = page.locator('nav[aria-label="Quick links"]');
    await expect(quickLinks).toBeVisible();

    // Calendar link
    await expect(quickLinks.locator('text=Content Calendar')).toBeVisible();
    // Timeline link
    await expect(quickLinks.locator('text=Persona Timeline')).toBeVisible();
    // Compare link
    await expect(quickLinks.locator('text=Compare Platforms')).toBeVisible();
  });

  test('Settings link navigates correctly', async ({ page }) => {
    await page.locator('a[aria-label="Settings"]').click();
    await page.waitForURL('**/settings**');
  });
});
