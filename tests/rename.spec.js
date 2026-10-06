const { test, expect } = require('@playwright/test');
const { openApp, readStored } = require('./helpers');

function dayKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const today = dayKey(new Date());
const yesterday = dayKey(new Date(Date.now() - 864e5));

const DATA = {
  version: 3, exercises: ['單槓', '伏地挺身'], lastEx: '單槓', loads: { '單槓': -15 },
  days: {
    [yesterday]: { sets: [{ id: 'a', ex: '單槓', reps: 5, t: 1 }, { id: 'b', ex: '伏地挺身', reps: 20, t: 2 }] },
    [today]: { sets: [{ id: 'c', ex: '單槓', reps: 6, t: 3, w: -15 }] },
  },
};

async function renameTo(page, from, to) {
  await page.locator('#chips .chip.add').click();
  const input = page.locator('#exList .exrow input').nth(DATA.exercises.indexOf(from));
  await expect(input).toHaveValue(from);
  await input.fill(to);
  await page.locator('#saveEx').click();
}

test('改動作名稱時，之前記的組、統計、上次的負重都跟著改名', async ({ page }) => {
  await openApp(page, DATA);
  await page.locator('#seg button[data-r="all"]').click();
  await renameTo(page, '單槓', '引體向上');

  const d = await readStored(page);
  expect(d.days[yesterday].sets.map(s => s.ex)).toEqual(['引體向上', '伏地挺身']);
  expect(d.days[today].sets.map(s => s.ex)).toEqual(['引體向上']);
  expect(d.loads).toEqual({ '引體向上': -15 });
  expect(d.lastEx).toBe('引體向上');

  await expect(page.locator('#statRows .srow .ex')).toHaveText([/^引體向上/, /^伏地挺身/]);
  await expect(page.locator('#bars .cap span').first()).toHaveText('引體向上');
  await expect(page.locator('#history')).not.toContainText('單槓');
  await expect(page.locator('#log')).toHaveText('記一組　引體向上');
});

test('兩個動作互換名稱，紀錄也跟著互換', async ({ page }) => {
  await openApp(page, DATA);
  await page.locator('#chips .chip.add').click();
  const inputs = page.locator('#exList .exrow input');
  await inputs.nth(0).fill('伏地挺身');
  await inputs.nth(1).fill('單槓');
  await page.locator('#saveEx').click();

  const d = await readStored(page);
  expect(d.exercises).toEqual(['伏地挺身', '單槓']);
  expect(d.days[yesterday].sets.map(s => s.ex)).toEqual(['伏地挺身', '單槓']);
});

test('移除動作不會刪掉它之前的紀錄', async ({ page }) => {
  await openApp(page, DATA);
  await page.locator('#chips .chip.add').click();
  await page.locator('#exList .exrow').nth(1).locator('button[aria-label="移除"]').click();
  await page.locator('#saveEx').click();

  const d = await readStored(page);
  expect(d.exercises).toEqual(['單槓']);
  expect(d.days[yesterday].sets.map(s => s.ex)).toEqual(['單槓', '伏地挺身']);
});
