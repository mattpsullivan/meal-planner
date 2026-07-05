import { test, expect } from '@playwright/test';

test.describe('Full User Flow', () => {
  test.describe('Home → Week → Day → Recipe', () => {
    test('should navigate through the main user journey', async ({ page }) => {
      // 1. Start at homepage
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Meal Planner' })).toBeVisible();

      // 2. Wait for weeks to load and click Week 1
      await expect(page.getByRole('heading', { name: /Week 1/ })).toBeVisible({
        timeout: 10000,
      });
      await page.getByRole('heading', { name: 'Week 1' }).click();

      // 3. Should be on week page with calendar
      await expect(page).toHaveURL(/\/week\/1/);
      await expect(page.getByText(/Day 1/)).toBeVisible();

      // 4. Click on a day to see meals
      await page.getByText(/Day 1/).first().click();
      await expect(page).toHaveURL(/\/week\/1\/day\/1/);

      // 5. Should see meal cards (breakfast, lunch, dinner)
      await expect(page.getByText(/Breakfast/i)).toBeVisible();
      await expect(page.getByText(/Lunch/i)).toBeVisible();
      await expect(page.getByText(/Dinner/i)).toBeVisible();

      // 6. Click on a meal to view recipe
      const mealLinks = page.locator('a[href*="/recipe/"]');
      const mealCount = await mealLinks.count();
      expect(mealCount).toBeGreaterThan(0);

      await mealLinks.first().click();

      // 7. Should be on recipe page
      await expect(page).toHaveURL(/\/recipe\/.+/);
      await expect(page.getByText(/Ingredients/i)).toBeVisible();
      await expect(page.getByText(/Instructions/i)).toBeVisible();
    });

    test('should navigate to shop page from week', async ({ page }) => {
      await page.goto('/');

      // Navigate to Week 1
      await expect(page.getByRole('heading', { name: /Week 1/ })).toBeVisible({
        timeout: 10000,
      });
      await page.getByRole('heading', { name: 'Week 1' }).click();
      await expect(page).toHaveURL(/\/week\/1/);

      // Click Shop/Grocery button
      await page.getByRole('link', { name: /Shop|Grocery/i }).click();

      // Should be on shop page
      await expect(page).toHaveURL(/\/week\/1\/shop/);
    });
  });

  test.describe('Shop Page Functionality', () => {
    test('should load grocery list without errors', async ({ page }) => {
      await page.goto('/week/1/shop');

      // Should not show error state
      await expect(page.getByText(/Failed to load/i)).not.toBeVisible();

      // Should show grocery list content
      await expect(page.getByText(/Shopping Progress/i)).toBeVisible({ timeout: 10000 });

      // Should have category sections
      await expect(page.getByText(/Produce/i)).toBeVisible();
    });

    test('should display grocery items with quantities', async ({ page }) => {
      await page.goto('/week/1/shop');

      // Wait for list to load
      await expect(page.getByText(/Shopping Progress/i)).toBeVisible({ timeout: 10000 });

      // Should have checkboxes for items
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();
      expect(checkboxCount).toBeGreaterThan(0);
    });

    test('should toggle item checked state', async ({ page }) => {
      await page.goto('/week/1/shop');

      // Wait for list to load
      await expect(page.getByText(/Shopping Progress/i)).toBeVisible({ timeout: 10000 });

      // Get initial progress
      const progressText = page.getByText(/\d+\/\d+ items/);
      await expect(progressText).toBeVisible();
      const initialProgress = await progressText.textContent();

      // Click first checkbox
      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();

      // Progress should update
      await expect(progressText).not.toHaveText(initialProgress ?? '');
    });

    test('should show Clear checked button after checking items', async ({ page }) => {
      await page.goto('/week/1/shop');

      // Wait for list to load
      await expect(page.getByText(/Shopping Progress/i)).toBeVisible({ timeout: 10000 });

      // Initially no "Clear checked" button (or disabled)
      const clearButton = page.getByRole('button', { name: /Clear checked/i });

      // Check an item
      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();

      // Clear button should now be visible
      await expect(clearButton).toBeVisible();
    });
  });

  test.describe('Recipe Page Functionality', () => {
    test('should display recipe details', async ({ page }) => {
      // Navigate to a known recipe
      await page.goto('/');
      await expect(page.getByRole('heading', { name: /Week 1/ })).toBeVisible({
        timeout: 10000,
      });
      await page.getByRole('heading', { name: 'Week 1' }).click();

      // Go to day page
      await page.getByText(/Day 1/).first().click();
      await expect(page).toHaveURL(/\/week\/1\/day\/1/);

      // Click on a recipe
      const recipeLink = page.locator('a[href*="/recipe/"]').first();
      await recipeLink.click();

      // Recipe page should have key sections
      await expect(page.getByText(/Ingredients/i)).toBeVisible();
      await expect(page.getByText(/Instructions/i)).toBeVisible();

      // Should show servings info
      await expect(page.getByText(/servings?/i)).toBeVisible();
    });

    test('should have serving scaler', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: /Week 1/ })).toBeVisible({
        timeout: 10000,
      });
      await page.getByRole('heading', { name: 'Week 1' }).click();
      await page.getByText(/Day 1/).first().click();

      const recipeLink = page.locator('a[href*="/recipe/"]').first();
      await recipeLink.click();

      // Should have +/- buttons for scaling
      const minusButton = page.getByRole('button', { name: /-/ });
      const plusButton = page.getByRole('button', { name: /\+/ });

      // At least one set of scaling buttons should exist
      const hasScaler = (await minusButton.count()) > 0 || (await plusButton.count()) > 0;
      expect(hasScaler).toBeTruthy();
    });
  });

  test.describe('Navigation', () => {
    test('should have working back navigation', async ({ page }) => {
      await page.goto('/');

      // Navigate deep: home → week → day
      await expect(page.getByRole('heading', { name: /Week 1/ })).toBeVisible({
        timeout: 10000,
      });
      await page.getByRole('heading', { name: 'Week 1' }).click();
      await expect(page).toHaveURL(/\/week\/1/);

      await page.getByText(/Day 1/).first().click();
      await expect(page).toHaveURL(/\/week\/1\/day\/1/);

      // Use browser back
      await page.goBack();
      await expect(page).toHaveURL(/\/week\/1/);

      await page.goBack();
      await expect(page).toHaveURL('/');
    });

    test('should navigate via header links', async ({ page }) => {
      await page.goto('/week/1/shop');

      // Click on app title/logo to go home
      await page.getByRole('link', { name: /Meal Planner/i }).click();
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Error States', () => {
    test('should show 404 for invalid routes', async ({ page }) => {
      await page.goto('/nonexistent-page');

      await expect(page.getByText(/not found|404/i)).toBeVisible();
    });

    test('should handle invalid week ID gracefully', async ({ page }) => {
      await page.goto('/week/999');

      // Should show some indication of invalid week or redirect
      // Not crash with React error
      await expect(page.locator('body')).not.toContainText('Unexpected Application Error');
    });
  });
});
