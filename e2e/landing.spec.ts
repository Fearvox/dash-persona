import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('renders hero section with brand and CTA', async ({ page }) => {
    await page.goto('/');

    // Brand name visible
    await expect(page.locator('text=DashPersona')).toBeVisible();

    // CTA buttons present
    await expect(page.locator('a[href*="/dashboard?source=demo"]')).toBeVisible();
    await expect(page.locator('text=Try Demo')).toBeVisible();
    await expect(page.locator('text=Get Started')).toBeVisible();
  });

  test('pipeline section renders', async ({ page }) => {
    await page.goto('/');

    // Pipeline heading exists
    const pipelineSection = page.locator('[aria-labelledby="pipeline-heading"]');
    await expect(pipelineSection).toBeVisible();
  });
});
