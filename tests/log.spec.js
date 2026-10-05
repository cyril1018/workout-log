const { test, expect } = require('@playwright/test');
const { openApp, readStored } = require('./helpers');

test('第一次打開就能直接記一組', async ({ page }) => {
  await openApp(page);
  const log = page.locator('#log');
  await expect(log).toBeEnabled();
  await expect(log).toContainText('單槓');
  await log.click();
  await expect(page.locator('#todayTotal')).toHaveText('8');
  await expect(page.locator('#todaySets')).toHaveText('1');
});

test('清除全部紀錄後還是能直接記一組', async ({ page }) => {
  await openApp(page);
  await page.locator('#log').click();
  await page.locator('#clearAll').click();
  await page.locator('#clearGo').click();
  await expect(page.locator('#log')).toBeEnabled();
  await page.locator('#log').click();
  await expect(page.locator('#todaySets')).toHaveText('1');
});

test('記的組數會存進 localStorage', async ({ page }) => {
  await openApp(page);
  await page.locator('#plus').click();
  await page.locator('#log').click();
  const d = await readStored(page);
  const sets = Object.values(d.days)[0].sets;
  expect(sets).toHaveLength(1);
  expect(sets[0]).toMatchObject({ ex: '單槓', reps: 9 });
});
