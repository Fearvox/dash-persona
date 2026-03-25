import { test, expect } from '@playwright/test';

test.describe('Compare page (demo mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compare?source=demo&persona=tutorial');
  });

  test('renders page header with back link', async ({ page }) => {
    await expect(
      page.locator('h1:has-text("Cross-Platform Comparison")'),
    ).toBeVisible();

    // Back to dashboard link
    await expect(
      page.locator('a[aria-label="Back to dashboard"]'),
    ).toBeVisible();
  });

  test('renders Key Metrics comparison table', async ({ page }) => {
    await expect(page.locator('#metrics-heading')).toHaveText('Key Metrics');

    // Table should contain platform columns (desktop view)
    await expect(page.locator('text=Douyin')).toBeVisible();
    await expect(page.locator('text=TikTok')).toBeVisible();
    await expect(page.locator('text=Red Note')).toBeVisible();

    // Metric rows
    await expect(page.locator('text=Followers')).toBeVisible();
    await expect(page.locator('text=Engagement Rate')).toBeVisible();
  });

  test('renders Radar Overview chart', async ({ page }) => {
    await expect(page.locator('#radar-heading')).toHaveText('Radar Overview');

    // Recharts renders SVG
    const radarSection = page.locator('section:has(#radar-heading)');
    await expect(radarSection.locator('svg').first()).toBeVisible();
  });

  test('renders Insight Highlights when available', async ({ page }) => {
    // Insights section may or may not appear depending on data
    const insightsHeading = page.locator('#insights-heading');
    const isVisible = await insightsHeading.isVisible();

    if (isVisible) {
      await expect(insightsHeading).toHaveText('Insight Highlights');
      // At least one insight card
      const insightCards = page.locator(
        'section:has(#insights-heading) .card',
      );
      const count = await insightCards.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('renders Persona Score Comparison cards', async ({ page }) => {
    await expect(page.locator('#scores-heading')).toHaveText(
      'Persona Score Comparison',
    );

    // Should have 3 score cards (one per platform)
    const scoreCards = page.locator(
      'section:has(#scores-heading) .card',
    );
    const count = await scoreCards.count();
    expect(count).toBe(3);
  });
});
