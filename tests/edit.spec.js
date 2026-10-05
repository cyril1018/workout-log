const { test, expect } = require('@playwright/test');
const { openApp, readStored } = require('./helpers');

function todaySets(d) { return Object.values(d.days)[0].sets; }

const PAST = { version: 1, exercises: ['單槓'],
  days: { '2026-09-01': { date: '2026-09-01', sets: [{ id: 'old1', ex: '單槓', reps: 6, t: 1 }] } } };

test('點今天的一組可以改次數和重量', async ({ page }) => {
  await openApp(page);
  await page.locator('#log').click();
  await page.locator('#todayDay .set').click();
  const sheet = page.locator('#editSheet');
  await expect(sheet).toBeVisible();
  await expect(page.locator('#editReps')).toHaveValue('8');
  await page.locator('#editReps').fill('12');
  await page.locator('#editLoad button[data-m="add"]').click();
  await page.locator('#editKg').fill('5');
  await page.locator('#editSave').click();
  await expect(sheet).toBeHidden();
  expect(todaySets(await readStored(page))[0]).toMatchObject({ reps: 12, w: 5 });
  await expect(page.locator('#todayTotal')).toHaveText('12');
});

test('編輯視窗會帶出原本的重量', async ({ page }) => {
  await openApp(page);
  await page.locator('#load button[data-m="band"]').click();
  await page.locator('#kg').fill('15');
  await page.locator('#log').click();
  await page.locator('#todayDay .set').click();
  await expect(page.locator('#editLoad button[data-m="band"]')).toHaveClass(/on/);
  await expect(page.locator('#editKg')).toHaveValue('15');
});

test('改成徒手會把重量拿掉', async ({ page }) => {
  await openApp(page);
  await page.locator('#load button[data-m="add"]').click();
  await page.locator('#kg').fill('10');
  await page.locator('#log').click();
  await page.locator('#todayDay .set').click();
  await page.locator('#editLoad button[data-m="body"]').click();
  await page.locator('#editSave').click();
  expect(todaySets(await readStored(page))[0].w).toBeUndefined();
});

test('取消不會改到紀錄', async ({ page }) => {
  await openApp(page);
  await page.locator('#log').click();
  await page.locator('#todayDay .set').click();
  await page.locator('#editReps').fill('30');
  await page.locator('#editCancel').click();
  await expect(page.locator('#editSheet')).toBeHidden();
  expect(todaySets(await readStored(page))[0].reps).toBe(8);
});

test('可以從編輯視窗刪掉一組', async ({ page }) => {
  await openApp(page);
  await page.locator('#log').click();
  await page.locator('#log').click();
  await page.locator('#todayDay .set').first().click();
  await page.locator('#editDelete').click();
  await expect(page.locator('#editSheet')).toBeHidden();
  await expect(page.locator('#todaySets')).toHaveText('1');
});

test('之前日子的紀錄也能改', async ({ page }) => {
  await openApp(page, PAST);
  await page.locator('#history .set').click();
  await expect(page.locator('#editReps')).toHaveValue('6');
  await page.locator('#editReps').fill('7');
  await page.locator('#editSave').click();
  expect((await readStored(page)).days['2026-09-01'].sets[0].reps).toBe(7);
  await expect(page.locator('#history .set')).toHaveText('7');
});

test('刪掉某天唯一的一組，那天就從之前裡消失', async ({ page }) => {
  await openApp(page, PAST);
  await page.locator('#history .set').click();
  await page.locator('#editDelete').click();
  await expect(page.locator('#history')).toContainText('還沒有過去的紀錄');
  expect((await readStored(page)).days['2026-09-01']).toBeUndefined();
});
