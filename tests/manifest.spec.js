const { test, expect } = require('@playwright/test');
const { SERVER_URL } = require('./helpers');

// Width and height from a PNG's IHDR chunk.
function pngSize(buf) {
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)].join('x');
}

test('manifest 可以加到主畫面：名稱、全螢幕、圖示尺寸都對', async ({ page, request }) => {
  await page.goto(SERVER_URL);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const res = await request.get(new URL(href, SERVER_URL).href);
  expect(res.ok()).toBe(true);
  const m = await res.json();

  expect(m.name).toBe('運動紀錄');
  expect(m.short_name).toBe('運動紀錄');
  expect(m.display).toBe('standalone');
  expect(m.start_url).toBe('./');
  expect(m.scope).toBe('./');

  const purposes = m.icons.map(i => i.purpose || 'any');
  expect(purposes).toContain('maskable');
  expect(m.icons.filter(i => (i.purpose || 'any') === 'any').map(i => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));

  for (const icon of m.icons) {
    const img = await request.get(new URL(icon.src, res.url()).href);
    expect(img.ok(), icon.src).toBe(true);
    expect(pngSize(await img.body()), icon.src).toBe(icon.sizes);
  }
});

test('iPhone 主畫面圖示、分頁小圖示、狀態列顏色都有設定', async ({ page, request }) => {
  await page.goto(SERVER_URL);

  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  const appleImg = await request.get(new URL(apple, SERVER_URL).href);
  expect(pngSize(await appleImg.body())).toBe('180x180');

  const favicons = await page.locator('link[rel="icon"]').evaluateAll(ls => ls.map(l => l.href));
  expect(favicons.length).toBeGreaterThan(0);
  for (const href of favicons) expect((await request.get(href)).ok(), href).toBe(true);

  const themes = await page.locator('meta[name="theme-color"]').evaluateAll(ms => ms.map(m => [m.media, m.content]));
  expect(themes).toEqual(expect.arrayContaining([
    ['(prefers-color-scheme: light)', '#F1F3F6'],
    ['(prefers-color-scheme: dark)', '#111318'],
  ]));
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', '運動紀錄');
});
