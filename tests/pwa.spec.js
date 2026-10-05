const { test, expect } = require('@playwright/test');
const { SERVER_URL } = require('./helpers');

// These tests share the test server's deploy counter, so run them one at a time.
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ request }) => {
  await request.post(SERVER_URL + '__reset');
});

// First visit installs the service worker; reload so the page is controlled by it.
async function openControlled(page) {
  await page.goto(SERVER_URL);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test('離線也能打開，而且樣式和程式都在', async ({ page, context }) => {
  await openControlled(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#log')).toBeEnabled();
  await expect(page.locator('#log')).toHaveCSS('border-radius', '16px');
  await page.locator('#log').click();
  await expect(page.locator('#todaySets')).toHaveText('1');
});

test('線上時不會被 10 分鐘快取卡住，拿到的是最新的 index.html', async ({ page, request }) => {
  await openControlled(page);
  await request.post(SERVER_URL + '__bump');
  const html = await page.evaluate(() => fetch('index.html').then(r => r.text()));
  expect(html).toMatch(/app\.js\?v=[^"]+\.b1"/);
});

test('切回 app 時，如果伺服器有新版會出現更新提示', async ({ page, request }) => {
  await openControlled(page);
  const comeBack = () => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

  await comeBack();
  await page.waitForTimeout(300);
  await expect(page.locator('#update')).toBeHidden();

  await request.post(SERVER_URL + '__bump');
  await comeBack();
  await expect(page.locator('#update')).toBeVisible();

  await page.locator('#update').click();
  await expect(page.locator('script[src*="app.js"]')).toHaveAttribute('src', /\.b1$/);
  await expect(page.locator('#update')).toBeHidden();
});
