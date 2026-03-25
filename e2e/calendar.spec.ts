import { test, expect } from '@playwright/test';

test.describe('Calendar page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar?source=demo&persona=tutorial');
  });

  test('renders month view with day headers', async ({ page }) => {
    // Day column headers (Mon-Sun)
    await expect(page.locator('text=Mon')).toBeVisible();
    await expect(page.locator('text=Tue')).toBeVisible();
    await expect(page.locator('text=Wed')).toBeVisible();
    await expect(page.locator('text=Sun')).toBeVisible();
  });

  test('month navigation works', async ({ page }) => {
    // Get current month text
    const monthDisplay = page.locator('h2, h3').filter({ hasText: /January|February|March|April|May|June|July|August|September|October|November|December/ });
    await expect(monthDisplay.first()).toBeVisible();
    const initialText = await monthDisplay.first().textContent();

    // Click next month
    await page.locator('button[aria-label="Next month"]').click();

    // Month text should change
    const newText = await monthDisplay.first().textContent();
    expect(newText).not.toBe(initialText);

    // Click previous month to go back
    await page.locator('button[aria-label="Previous month"]').click();
    const restoredText = await monthDisplay.first().textContent();
    expect(restoredText).toBe(initialText);
  });

  test('renders content slots in calendar cells', async ({ page }) => {
    // Content plan slots should be visible (pills in calendar cells)
    // The calendar uses aria-label for each slot
    const slots = page.locator('[aria-label*="on Douyin"], [aria-label*="on TikTok"], [aria-label*="on Red Note"]');
    const count = await slots.count();
    expect(count).toBeGreaterThan(0);
  });
});
