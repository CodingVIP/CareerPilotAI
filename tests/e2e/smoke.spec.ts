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

test('creates an application and opens its detail dialog', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole('button', { name: /add application/i }).click();
  const dialog = page.getByRole('dialog', { name: /add new job application/i });
  await dialog.getByPlaceholder('e.g. Stripe, Linear').fill('Acme');
  await dialog.getByPlaceholder('e.g. Staff Frontend Engineer').fill('Senior Engineer');
  await dialog.getByRole('button', { name: /save to pipeline/i }).click();

  await expect(page.getByText('Senior Engineer', { exact: true })).toBeVisible();
  await page.getByText('Senior Engineer', { exact: true }).click();
  await expect(page.getByRole('dialog', { name: /application details/i })).toBeVisible();
});

test('enables cloud sync controls from privacy settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /privacy settings/i }).click();
  const dialog = page.getByRole('dialog', { name: /privacy controls and data synchronization/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Disabled' }).click();
  await expect(dialog.getByRole('button', { name: /sync pending changes/i })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /load cloud data/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
