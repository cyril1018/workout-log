const { test, expect } = require('@playwright/test');
const { openApp, readStored } = require('./helpers');

function pad(n) { return String(n).padStart(2, '0'); }
const now = new Date();
const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
const at = m => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, m).getTime();

// A weight-type lift with one set in kg and one in lb, plus a band-assisted pull-up in kg.
function mixed(unit) {
  return {
    version: 4, unit, exercises: ['深蹲', '單槓'], types: { '深蹲': 'weight' }, lastEx: '深蹲',
    days: { [today]: { date: today, sets: [
      { id: 'k', ex: '深蹲', reps: 5, t: at(0), w: 100 },
      { id: 'p', ex: '深蹲', reps: 5, t: at(5), w: 100, u: 'lb' },
      { id: 'b', ex: '單槓', reps: 8, t: at(10), w: -15 },
    ] } },
  };
}

async function setUnit(page, unit) {
  await page.locator(`.units button[data-unit="${unit}"]`).click();
}

test.describe('美國的手機', () => {
  test.use({ locale: 'en-US' });

  test('預設用磅，加減按鈕是 ±5', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('.units button[data-unit="lb"]')).toHaveClass(/on/);
    await page.locator('#load button[data-m="add"]').click();
    await expect(page.locator('#load .kg span')).toHaveText('lb');
    await expect(page.locator('#load button[data-d]')).toHaveText(['−5', '+5']);
    await page.locator('#load button[data-d="5"]').click();
    await page.locator('#load button[data-d="5"]').click();
    await expect(page.locator('#kg')).toHaveValue('10');
  });

  test('已經有紀錄但沒存過單位的人（之前只有公斤），維持公斤', async ({ page }) => {
    await openApp(page, { version: 3, exercises: ['Pull-ups'], days: {} });
    await expect(page.locator('.units button[data-unit="kg"]')).toHaveClass(/on/);
  });
});

test('台灣的手機預設公斤，±2.5', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('.units button[data-unit="kg"]')).toHaveClass(/on/);
  await expect(page.locator('#load button[data-d]')).toHaveText(['−2.5', '+2.5']);
});

test('用磅記的組照原樣存，切到公斤會換算，切回來還是原本的數字', async ({ page }) => {
  await openApp(page, { version: 3, exercises: ['深蹲'], types: { '深蹲': 'weight' }, days: {} });
  await setUnit(page, 'lb');
  await page.locator('#kg').fill('45');
  await page.locator('#reps').fill('5');
  await page.locator('#log').click();
  await expect(page.locator('#toast')).toHaveText('深蹲 45lb × 5 下，記好了');
  expect((await readStored(page)).days[today].sets[0]).toMatchObject({ w: 45, u: 'lb' });
  await expect(page.locator('#todayDay .set')).toHaveText('45lb×5');

  await setUnit(page, 'kg');
  await expect(page.locator('#todayDay .set')).toHaveText('20.4kg×5');
  await setUnit(page, 'lb');
  await expect(page.locator('#todayDay .set')).toHaveText('45lb×5');
  expect((await readStored(page)).unit).toBe('lb');
});

test('公斤和磅混在一起時，訓練量換算成目前的單位', async ({ page }) => {
  await openApp(page, mixed('kg'));
  const tot = page.locator('#todayDay .row').first().locator('.tot');
  await expect(tot).toHaveText('726.8kg · 2 組');            // 500 + 100 lb × 5 (226.8)
  await expect(page.locator('#statRows .srow').first()).toContainText('最重 100kg');
  await expect(page.locator('#todayDay .row').nth(1).locator('.set')).toHaveText('8帶15kg');

  await setUnit(page, 'lb');
  await expect(tot).toHaveText('1,602.3lb · 2 組');          // 100 kg × 5 (1,102.3) + 500
  await expect(page.locator('#statRows .srow').first()).toContainText('最重 220.5lb');
  await expect(page.locator('#statRows .srow .v').first()).toHaveText('1,602.3總量 lb');
  await expect(page.locator('#bars .cap')).toContainText('最多一天 1,602.3 lb');
  await expect(page.locator('#todayDay .row').nth(1).locator('.set')).toHaveText('8帶33.1lb');
});

test('在磅模式打開公斤的組：只改次數不會動到重量，改了重量才用磅存', async ({ page }) => {
  await openApp(page, mixed('lb'));
  await page.locator('#todayDay .set').first().click();
  await expect(page.locator('#editKg')).toHaveValue('220.5');
  await expect(page.locator('#editLoad .kg span')).toHaveText('lb');
  await page.locator('#editReps').fill('6');
  await page.locator('#editSave').click();
  expect((await readStored(page)).days[today].sets[0]).toEqual({ id: 'k', ex: '深蹲', reps: 6, t: at(0), w: 100 });

  await page.locator('#todayDay .set').first().click();
  await page.locator('#editKg').fill('225');
  await page.locator('#editSave').click();
  expect((await readStored(page)).days[today].sets[0]).toMatchObject({ w: 225, u: 'lb', reps: 6 });
});

test('切換單位時，上次用的負重也跟著換算', async ({ page }) => {
  await openApp(page, { version: 3, exercises: ['單槓'], loads: { '單槓': 20 }, days: {} });
  await expect(page.locator('#kg')).toHaveValue('20');
  await setUnit(page, 'lb');
  await expect(page.locator('#kg')).toHaveValue('44');
  await expect(page.locator('#load .kg span')).toHaveText('lb');
});

test('CSV 有重量和單位兩欄，數字照原本輸入的', async ({ page }) => {
  await openApp(page, mixed('kg'));
  await page.locator('#exportCsv').click();
  const lines = (await page.locator('#exportBox').inputValue()).replace(/^\ufeff/, '').split(/\r?\n/);
  expect(lines[0]).toBe('"日期","動作","次數","負重","重量","單位","時間"');
  expect(lines[1]).toMatch(/^"[\d-]+","深蹲","5","重量","100","kg","\d\d:\d\d"$/);
  expect(lines[2]).toMatch(/^"[\d-]+","深蹲","5","重量","100","lb","\d\d:\d\d"$/);
  expect(lines[3]).toMatch(/^"[\d-]+","單槓","8","拉力帶","15","kg","\d\d:\d\d"$/);
});

test('備份匯出再匯入，磅的組還是磅', async ({ page }) => {
  await openApp(page, mixed('kg'));
  await page.locator('#exportJson').click();
  const backup = await page.locator('#exportBox').inputValue();
  await openApp(page);
  await page.locator('#importBtn').click();
  await page.locator('#importBox').fill(backup);
  await page.locator('#importGo').click();
  const sets = (await readStored(page)).days[today].sets;
  expect(sets.find(s => s.id === 'p')).toMatchObject({ w: 100, u: 'lb' });
  expect(sets.find(s => s.id === 'k').u).toBeUndefined();
});
