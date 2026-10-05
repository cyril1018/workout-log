const { test, expect } = require('@playwright/test');
const { openApp, readStored } = require('./helpers');

function todaySets(d) { return Object.values(d.days)[0].sets; }

async function setLoad(page, mode, kg) {
  await page.locator(`#load button[data-m="${mode}"]`).click();
  if (kg !== undefined) await page.locator('#kg').fill(String(kg));
}

test('預設動作是單槓和伏地挺身', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#chips .chip:not(.add)')).toHaveText(['單槓', '伏地挺身']);
});

test('預設是徒手，不會出現公斤欄位', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#load button[data-m="body"]')).toHaveClass(/on/);
  await expect(page.locator('#kg')).toBeHidden();
  await page.locator('#log').click();
  const s = todaySets(await readStored(page))[0];
  expect(s.w).toBeUndefined();
  await expect(page.locator('#todayDay .set')).toHaveText('8');
});

test('加重 10kg 會記成 +10kg', async ({ page }) => {
  await openApp(page);
  await setLoad(page, 'add', 10);
  await page.locator('#log').click();
  expect(todaySets(await readStored(page))[0].w).toBe(10);
  await expect(page.locator('#todayDay .set')).toHaveText('8+10kg');
});

test('拉力帶 15kg 會記成 帶15kg', async ({ page }) => {
  await openApp(page);
  await setLoad(page, 'band', 15);
  await page.locator('#log').click();
  expect(todaySets(await readStored(page))[0].w).toBe(-15);
  await expect(page.locator('#todayDay .set')).toHaveText('8帶15kg');
});

test('選了加重但沒填公斤，就當作徒手', async ({ page }) => {
  await openApp(page);
  await setLoad(page, 'add', '');
  await page.locator('#log').click();
  expect(todaySets(await readStored(page))[0].w).toBeUndefined();
});

test('每個動作記住自己上次的重量，重新整理也還在', async ({ page }) => {
  await openApp(page);
  await setLoad(page, 'band', 15);
  await page.locator('#chips .chip', { hasText: '伏地挺身' }).click();
  await expect(page.locator('#load button[data-m="body"]')).toHaveClass(/on/);
  await page.locator('#chips .chip', { hasText: '單槓' }).click();
  await expect(page.locator('#load button[data-m="band"]')).toHaveClass(/on/);
  await expect(page.locator('#kg')).toHaveValue('15');
  await page.reload();
  await expect(page.locator('#load button[data-m="band"]')).toHaveClass(/on/);
  await expect(page.locator('#kg')).toHaveValue('15');
});

test('統計會顯示加重動作的最重重量', async ({ page }) => {
  await openApp(page);
  await setLoad(page, 'add', 5);
  await page.locator('#log').click();
  await page.locator('#kg').fill('12.5');
  await page.locator('#log').click();
  await expect(page.locator('#statRows .srow').first()).toContainText('最重 +12.5kg');
});

test('CSV 有負重和公斤欄位', async ({ page }) => {
  await openApp(page);
  await setLoad(page, 'band', 15);
  await page.locator('#log').click();
  await page.locator('#exportCsv').click();
  const csv = await page.locator('#exportBox').inputValue();
  // A textarea normalizes line breaks to \n.
  const lines = csv.replace(/^\ufeff/, '').split(/\r?\n/);
  expect(lines[0]).toBe('"日期","動作","次數","負重","公斤","時間"');
  expect(lines[1]).toMatch(/^"\d{4}-\d{2}-\d{2}","單槓","8","拉力帶","15","\d\d:\d\d"$/);
});

test('匯出再匯入會保留重量', async ({ page }) => {
  await openApp(page);
  await setLoad(page, 'add', 20);
  await page.locator('#log').click();
  await page.locator('#exportJson').click();
  const backup = await page.locator('#exportBox').inputValue();
  await openApp(page);
  await page.locator('#importBtn').click();
  await page.locator('#importBox').fill(backup);
  await page.locator('#importGo').click();
  expect(todaySets(await readStored(page))[0].w).toBe(20);
});

test('舊格式的備份（沒有重量）可以匯入，當作徒手', async ({ page }) => {
  await openApp(page);
  const old = { app: 'workoutlog', version: 1, exercises: ['單槓'],
    days: { '2026-09-01': { date: '2026-09-01', sets: [{ id: 'a1', ex: '單槓', reps: 6, t: 1 }] } } };
  await page.locator('#importBtn').click();
  await page.locator('#importBox').fill(JSON.stringify(old));
  await page.locator('#importGo').click();
  const s = (await readStored(page)).days['2026-09-01'].sets[0];
  expect(s).toMatchObject({ id: 'a1', reps: 6 });
  expect(s.w).toBeUndefined();
  await expect(page.locator('#history .set')).toHaveText('6');
});
