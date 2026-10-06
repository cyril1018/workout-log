const { test, expect } = require('@playwright/test');
const { openApp, readStored } = require('./helpers');

function pad(n) { return String(n).padStart(2, '0'); }
function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function at(daysAgo, h, m, s = 0) { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, s, 0); return d; }

const today = dayKey(at(0, 12, 0));
const yesterday = dayKey(at(1, 12, 0));
const tomorrow = dayKey(at(-1, 12, 0));

function dataWith(days) { return { version: 3, exercises: ['單槓'], lastEx: '單槓', days }; }
const TWO_TODAY = dataWith({ [today]: { date: today, sets: [
  { id: 'a', ex: '單槓', reps: 5, t: at(0, 8, 0).getTime() },
  { id: 'b', ex: '單槓', reps: 7, t: at(0, 9, 0).getTime() },
] } });

async function openFirstToday(page) {
  await page.locator('#todayDay .set').first().click();
  await expect(page.locator('#editSheet')).toBeVisible();
}

test('編輯視窗會帶出這組的日期和時間', async ({ page }) => {
  await openApp(page, TWO_TODAY);
  await openFirstToday(page);
  await expect(page.locator('#editDate')).toHaveValue(today);
  await expect(page.locator('#editTime')).toHaveValue('08:00');
  await expect(page.locator('#editDate')).toHaveAttribute('max', today);
});

test('改時間後，這組照新時間排序', async ({ page }) => {
  await openApp(page, TWO_TODAY);
  await openFirstToday(page);
  await page.locator('#editTime').fill('10:30');
  await page.locator('#editSave').click();

  const sets = (await readStored(page)).days[today].sets;
  expect(sets.map(s => s.id)).toEqual(['b', 'a']);
  expect(sets[1].t).toBe(at(0, 10, 30).getTime());
  await expect(page.locator('#todayDay .set')).toHaveText(['7', '5']);
});

test('改日期會把這組搬到那一天，時間不變', async ({ page }) => {
  await openApp(page, TWO_TODAY);
  await openFirstToday(page);
  await page.locator('#editDate').fill(yesterday);
  await page.locator('#editSave').click();

  const d = await readStored(page);
  expect(d.days[today].sets.map(s => s.id)).toEqual(['b']);
  expect(d.days[yesterday].sets).toEqual([{ id: 'a', ex: '單槓', reps: 5, t: at(1, 8, 0).getTime() }]);
  await expect(page.locator('#todayTotal')).toHaveText('7');
  await expect(page.locator('#history .set')).toHaveText('5');
});

test('一天唯一的一組搬走後，那天就不見了', async ({ page }) => {
  await openApp(page, dataWith({ [yesterday]: { date: yesterday, sets: [{ id: 'a', ex: '單槓', reps: 5, t: at(1, 8, 0).getTime() }] } }));
  await page.locator('#history .set').click();
  await page.locator('#editDate').fill(today);
  await page.locator('#editSave').click();

  const d = await readStored(page);
  expect(Object.keys(d.days)).toEqual([today]);
  await expect(page.locator('#todayTotal')).toHaveText('5');
});

test('不能改到未來的日期', async ({ page }) => {
  await openApp(page, TWO_TODAY);
  await openFirstToday(page);
  await page.locator('#editDate').fill(tomorrow);
  await page.locator('#editSave').click();

  await expect(page.locator('#toast')).toHaveText('不能選未來的日期');
  await expect(page.locator('#editSheet')).toBeVisible();
  expect(Object.keys((await readStored(page)).days)).toEqual([today]);
});

test('只改次數時，原本的時間（含秒）完全不變', async ({ page }) => {
  const t = at(0, 8, 0, 42).getTime() + 123;
  await openApp(page, dataWith({ [today]: { date: today, sets: [{ id: 'a', ex: '單槓', reps: 5, t }] } }));
  await openFirstToday(page);
  await page.locator('#editReps').fill('9');
  await page.locator('#editSave').click();
  expect((await readStored(page)).days[today].sets[0]).toMatchObject({ reps: 9, t });
});

test('沒有存時間的舊紀錄，時間欄是空的，存了也不會多出時間', async ({ page }) => {
  await openApp(page, dataWith({ [yesterday]: { date: yesterday, sets: [{ id: 'a', ex: '單槓', reps: 5 }] } }));
  await page.locator('#history .set').click();
  await expect(page.locator('#editDate')).toHaveValue(yesterday);
  await expect(page.locator('#editTime')).toHaveValue('');
  await page.locator('#editReps').fill('6');
  await page.locator('#editSave').click();
  expect((await readStored(page)).days[yesterday].sets).toEqual([{ id: 'a', ex: '單槓', reps: 6 }]);
});
