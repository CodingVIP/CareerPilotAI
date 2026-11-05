import { expect, test } from '@playwright/test';

test('loads the unauthenticated development experience', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/CareerPilot/i);
  await expect(page.getByRole('button', { name: 'Applications' })).toBeVisible();
});

test('opens and closes the add application dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add application/i }).click();
  const dialog = page.getByRole('dialog', { name: /add new job application/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByPlaceholder(/paste job url/i)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
