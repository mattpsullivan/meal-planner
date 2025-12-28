import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load and display the main title', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to initialize and render
    await expect(page.getByRole('heading', { name: 'Vegan Meal Prep' })).toBeVisible();
  });

  test('should display week cards after database initialization', async ({ page }) => {
    await page.goto('/');

    // Wait for loading to complete - week cards should appear
    // Each week card has a "Week X" heading
    await expect(page.getByRole('heading', { name: /Week \d/ }).first()).toBeVisible({
      timeout: 10000, // Allow time for DB init
    });

    // Should show all 5 weeks
    const weekHeadings = page.getByRole('heading', { name: /Week \d/ });
    await expect(weekHeadings).toHaveCount(5);
  });

  test('should display the How It Works section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'How It Works' })).toBeVisible();
    await expect(page.getByText('Choose a week to start your meal prep journey')).toBeVisible();
  });

  test('should navigate to week page when clicking a week card', async ({ page }) => {
    await page.goto('/');

    // Wait for week cards to load
    await expect(page.getByRole('heading', { name: /Week \d/ }).first()).toBeVisible({
      timeout: 10000,
    });

    // Click on Week 1
    await page.getByRole('heading', { name: 'Week 1' }).click();

    // Should navigate to week page
    await expect(page).toHaveURL(/\/week\/\d+/);
  });

  test('should not show error message on successful load', async ({ page }) => {
    await page.goto('/');

    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'Vegan Meal Prep' })).toBeVisible();

    // Error message should not be present
    await expect(page.getByText('Failed to load weeks')).not.toBeVisible();
  });
});
