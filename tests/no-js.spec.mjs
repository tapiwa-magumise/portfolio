import { test, expect } from '@playwright/test';

// Without JavaScript the text version is the page: everything is readable and every link works
test.use({ javaScriptEnabled: false });

test('the text version is the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#text')).toBeVisible();
  await expect(page.locator('#world')).toBeHidden();
  await expect(page.locator('#text h1')).toHaveText('Tapiwa Magumise, AWS Cloud Engineer');
});

test('it holds every account, project and certificate', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#text h2')).toHaveText(['Profile', 'Foundations and security', 'Data', 'Applications', 'AI', 'Experience', 'Certifications']);
  for (const name of ['Landing Zone', 'Migration and DR', 'Review Agent', 'Sales Pipeline', 'Edge Analytics', 'Retail Analytics', 'Invoicing API', 'Order System', 'RAG Assistant', 'This site']) {
    await expect(page.locator('#text h3', { hasText: name }).first()).toBeVisible();
  }
  await expect(page.locator('#text a[href*="credly.com"]')).toHaveCount(2);
  await expect(page.locator('#text a[download]')).toHaveCount(1);
});

test('it carries no controls that need the script', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#text button:visible')).toHaveCount(0);
});
