import { test, expect } from '@playwright/test';

test.describe('Prep Timeline Recipe Links', () => {
  test('prep steps should link to recipes when available', async ({ page }) => {
    // Go to homepage
    await page.goto('/');

    // Wait for week cards to load
    await expect(page.getByRole('heading', { name: /Week \d/ }).first()).toBeVisible({
      timeout: 10000,
    });

    // Click on Week 1
    await page.getByRole('heading', { name: 'Week 1' }).click();

    // Should be on week page
    await expect(page).toHaveURL(/\/week\/\d+/);

    // Click on the Prep Guide button
    await page.getByRole('button', { name: /Prep Guide/i }).click();

    // Should navigate to prep page
    await expect(page).toHaveURL(/\/week\/\d+\/prep/);

    // Wait for prep guide to load
    await expect(page.getByText(/Prep Guide/)).toBeVisible({ timeout: 5000 });

    // Click "Show All Steps" to expand the timeline
    await page.getByRole('button', { name: /Show All Steps/i }).click();

    // Wait for timeline to appear
    await expect(page.getByText('Full Prep Timeline')).toBeVisible();

    // Check that some prep steps are links (blue text)
    // Look for a link that contains recipe-related text
    const recipeLinks = page.locator('a[href^="/recipe/"]');

    // Should have at least some recipe links in the prep timeline
    const linkCount = await recipeLinks.count();
    console.log(`Found ${linkCount} recipe links in prep timeline`);

    expect(linkCount).toBeGreaterThan(0);

    // Click on the first recipe link
    const firstLink = recipeLinks.first();
    const linkText = await firstLink.textContent();
    console.log(`Clicking on recipe link: ${linkText}`);

    await firstLink.click();

    // Should navigate to recipe page
    await expect(page).toHaveURL(/\/recipe\/.+/);

    // Recipe page should show the recipe title
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
