import { test, expect } from '@playwright/test';

// Every test fails on a script error. The local file server has no favicon, which isn't an error in the site.
test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) page.errors.push(m.text()); });
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

const desktopOnly = (testInfo) => test.skip(testInfo.project.name !== 'desktop', 'desktop layout');

test('Start here draws the Organization and its six accounts', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-id=edge]').click();
  await expect(page.locator('[data-id=org]')).toBeVisible();
  await page.locator('[data-id=org]').click();
  await expect(page.locator('#boxes .acct')).toHaveCount(6);
});

test('going back retracts the branch you left', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.goTo('acct-data'));
  await expect(page.locator('[data-id=sales-pipeline]')).toBeVisible();
  await page.locator('#crumbs [data-go=org]').click();
  await expect(page.locator('[data-id=sales-pipeline]')).toHaveCount(0);
  await expect(page.locator('#crumbs [aria-current]')).toHaveText('AWS Organization');
});

test('a project draws its detail and opens in the console', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => window.goTo('edge-analytics'));
  await expect(page.locator('[data-id=ea-cf], .open-btn').first()).toBeVisible();
  await page.locator(testInfo.project.name === 'phone' ? '#t-open' : '.open-btn').click();
  await expect(page.locator('#console')).toHaveClass(/(^|\s)on(\s|$)/);
  await expect(page).toHaveURL(/#console\/edge-analytics\/overview$/);
  await expect(page.locator('#console h1')).toHaveText('Edge Analytics');
  await expect(page.locator('#console h1')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#console')).not.toHaveClass(/(^|\s)on(\s|$)/);
});

test('a link straight to a console tab opens it', async ({ page }) => {
  await page.goto('/#console/retail-analytics/decisions');
  await expect(page.locator('#console [role=tab][aria-selected=true]')).toHaveText('Decisions');
  await expect(page.locator('#crumbs [aria-current]')).toHaveText('Retail Analytics');
});

test('choosing a part opens its row in Resources', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.goTo('sales-pipeline'));
  await page.locator('#nodes .part').first().click();
  await expect(page.locator('#console tr.sel')).toHaveCount(1);
  await expect(page.locator('#console [role=tab][aria-selected=true]')).toContainText('Resources');
});

test('search finds a service and marks every project that uses it', async ({ page }) => {
  await page.goto('/');
  await page.locator('#q').fill('lambda');
  await expect(page.locator('#q-list [role=option]').first()).toContainText('Lambda');
  await page.keyboard.press('Enter');
  await expect(page.locator('#filter li')).toHaveCount(3);
  await expect(page.locator('#boxes .acct.match')).toHaveCount(2);
  await page.locator('#filter .f-x').click();
  await expect(page.locator('#filter')).toBeHidden();
  await expect(page.locator('.match')).toHaveCount(0);
});

test('a console tag runs the same search', async ({ page }) => {
  await page.goto('/#console/rag-assistant/overview');
  await page.locator('.cs-tag', { hasText: 'PostgreSQL' }).click();
  await expect(page.locator('#console')).not.toHaveClass(/(^|\s)on(\s|$)/);
  await expect(page.locator('#filter li')).toHaveCount(4);
});

test('blueprint mode switches and is remembered', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
  await page.locator('#t-theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blueprint');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blueprint');
});

test('a dark system setting starts in blueprint mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blueprint');
});

test('the first Tab stop opens the text version', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('#skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#text')).toBeVisible();
  await page.locator('#tv-back').click();
  await expect(page.locator('#text')).toBeHidden();
  await expect(page.locator('#skip')).toBeFocused();
});

test('moves are announced to screen readers', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.goTo('acct-data'));
  await expect(page.locator('#say')).toHaveText('Data, 3 inside');
});

test('the page never scrolls sideways', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.goTo('edge-analytics'));
  await page.waitForTimeout(1500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('controls are thumb-sized on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch screens');
  await page.goto('/');
  for (const sel of ['#t-out', '#t-in', '#t-fit', '#t-theme', '#q']) {
    const box = await page.locator(sel).boundingBox();
    expect(box.height, sel).toBeGreaterThanOrEqual(44);
  }
});

test('with reduced motion, lines appear without being drawn', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => window.goTo('org'));
  await expect(page.locator('#boxes .acct')).toHaveCount(6, { timeout: 400 });
});
