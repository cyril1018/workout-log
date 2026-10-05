const { test, expect } = require('@playwright/test');
const { openApp, readStored } = require('./helpers');

function todaySets(d) { return Object.values(d.days)[0].sets; }

const GYM = { version: 2, exercises: ['深蹲', '單槓'], types: { '深蹲': 'weight' } };

async function logSet(page, kg, reps) {
  await page.locator('#kg').fill(String(kg));
  await page.locator('#reps').fill(String(reps));
  await page.locator('#log').click();
}

test('在編輯裡可以把動作設成重量類', async ({ page }) => {
  await openApp(page);
  await page.locator('#chips .chip.add').click();
  await page.locator('#addRow').click();
  const row = page.locator('#exList .exrow').last();
  await row.locator('input').fill('深蹲');
  await expect(row.locator('button.type')).toHaveText('自重');
  await row.locator('button.type').click();
  await expect(row.locator('button.type')).toHaveText('重量');
  await page.locator('#saveEx').click();
  expect((await readStored(page)).types).toEqual({ '深蹲': 'weight' });

  await page.reload();
  await page.locator('#chips .chip.add').click();
  await expect(page.locator('#exList .exrow').last().locator('button.type')).toHaveText('重量');
});

test('重量類動作：沒有徒手／拉力帶，直接填重量，可以 ±2.5', async ({ page }) => {
  await openApp(page, GYM);
  await expect(page.locator('#load .seg')).toBeHidden();
  await expect(page.locator('#kg')).toBeVisible();
  await page.locator('#kg').fill('60');
  await page.locator('#load button[data-d="2.5"]').click();
  await expect(page.locator('#kg')).toHaveValue('62.5');
  await page.locator('#load button[data-d="-2.5"]').click();
  await expect(page.locator('#kg')).toHaveValue('60');
  await page.locator('#reps').fill('5');
  await page.locator('#log').click();
  expect(todaySets(await readStored(page))[0]).toMatchObject({ ex: '深蹲', reps: 5, w: 60 });
  await expect(page.locator('#todayDay .set')).toHaveText('60kg×5');
});

test('重量類動作會記住上次的重量', async ({ page }) => {
  await openApp(page, GYM);
  await logSet(page, 80, 5);
  await page.locator('#chips .chip', { hasText: '單槓' }).click();
  await expect(page.locator('#load .seg')).toBeVisible();
  await page.locator('#chips .chip', { hasText: '深蹲' }).click();
  await expect(page.locator('#kg')).toHaveValue('80');
});

test('今天那一列顯示總訓練量', async ({ page }) => {
  await openApp(page, GYM);
  await logSet(page, 100, 10);
  await logSet(page, 100, 10);
  await expect(page.locator('#todayDay .row .tot')).toHaveText('2,000kg · 2 組');
});

test('統計顯示總量和最重', async ({ page }) => {
  await openApp(page, GYM);
  await logSet(page, 100, 10);
  await logSet(page, 105, 2);
  const row = page.locator('#statRows .srow').first();
  await expect(row).toContainText('最重 105kg');
  await expect(row.locator('.v').first()).toHaveText('1,210總量 kg');
});

test('長條圖畫的是每天的訓練量', async ({ page }) => {
  await openApp(page, GYM);
  await logSet(page, 100, 10);
  await logSet(page, 100, 10);
  await expect(page.locator('#bars .cap')).toContainText('最多一天 2,000 kg');
});

test('自重動作不受影響，加重也不算訓練量', async ({ page }) => {
  await openApp(page, GYM);
  await page.locator('#chips .chip', { hasText: '單槓' }).click();
  await page.locator('#load button[data-m="add"]').click();
  await page.locator('#kg').fill('10');
  await page.locator('#log').click();
  await expect(page.locator('#todayDay .row .tot')).toHaveText('8下 · 1 組');
  await expect(page.locator('#statRows .srow .v').first()).toHaveText('8總共下');
});

test('自重的加重也能用 ±2.5', async ({ page }) => {
  await openApp(page);
  await page.locator('#load button[data-m="add"]').click();
  await page.locator('#load button[data-d="2.5"]').click();
  await page.locator('#load button[data-d="2.5"]').click();
  await expect(page.locator('#kg')).toHaveValue('5');
});

test('編輯重量類的一組，只有重量欄位', async ({ page }) => {
  await openApp(page, GYM);
  await logSet(page, 60, 5);
  await page.locator('#todayDay .set').click();
  await expect(page.locator('#editLoad .seg')).toBeHidden();
  await expect(page.locator('#editKg')).toHaveValue('60');
  await page.locator('#editLoad button[data-d="2.5"]').click();
  await page.locator('#editSave').click();
  expect(todaySets(await readStored(page))[0].w).toBe(62.5);
});

test('匯出再匯入會保留動作類型', async ({ page }) => {
  await openApp(page, GYM);
  await logSet(page, 60, 5);
  await page.locator('#exportJson').click();
  const backup = await page.locator('#exportBox').inputValue();
  await openApp(page);
  await page.locator('#importBtn').click();
  await page.locator('#importBox').fill(backup);
  await page.locator('#importGo').click();
  expect((await readStored(page)).types).toEqual({ '深蹲': 'weight' });
  await page.locator('#chips .chip', { hasText: '深蹲' }).click();
  await expect(page.locator('#load .seg')).toBeHidden();
});

test('清除全部紀錄會把動作類型也清掉', async ({ page }) => {
  await openApp(page, GYM);
  await page.locator('#clearAll').click();
  await page.locator('#clearGo').click();
  await page.locator('#log').click();
  expect((await readStored(page)).types).toEqual({});
});
