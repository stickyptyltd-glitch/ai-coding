import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page).toHaveTitle(/AI Coding Agent/i);
  await expect(page.locator('.logo-text')).toHaveText(/AI Coding Agent/i);
});

