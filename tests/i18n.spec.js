const { test, expect } = require('@playwright/test');
const { openApp, SERVER_URL } = require('./helpers');

// Everything in this file runs on a phone set to English.
test.use({ locale: 'en-US' });

// Chinese characters and punctuation (full-width symbols like the ＋ button are fine).
const CJK = /[　-〿㐀-鿿！-＊，-？]/;

// All interface text: visible or hidden text, aria-labels, placeholders and tooltips.
// The 中文 button of the language switch is meant to stay in Chinese, so it's left out.
function uiText(page) {
  return page.evaluate(() => {
    const body = document.body.cloneNode(true);
    body.querySelectorAll('.lang').forEach(e => e.remove());
    const attrs = [...body.querySelectorAll('[aria-label],[placeholder],[title]')]
      .map(e => [e.getAttribute('aria-label'), e.getAttribute('placeholder'), e.getAttribute('title')].join(' '));
    return body.textContent + ' ' + attrs.join(' ') + ' ' + document.title;
  });
}

test('手機是英文時，整個介面都是英文，預設動作也是英文', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#bars .cap span').last()).toHaveText('Last 14 days');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Workout Log');
  await expect(page.locator('#chips .chip')).toHaveText(['Pull-ups', 'Push-ups', 'Edit']);
  await expect(page.locator('#log')).toHaveText('Log a set · Pull-ups');
  await expect(page.locator('h2')).toHaveText(['Today', 'Stats', 'Earlier', 'Backup']);
  await expect(page.locator('#todayDate')).toHaveText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2}$/);

  // Produce as much dynamic text as possible, then look for any Chinese left over.
  await page.locator('#load button[data-m="band"]').click();
  await page.locator('#kg').fill('15');
  await page.locator('#log').click();
  await page.locator('#todayDay .set').click();
  await page.locator('#editCancel').click();
  await page.locator('#chips .chip.add').click();
  await page.locator('#cancelEx').click();
  await page.locator('#exportJson').click();
  await page.locator('#exportClose').click();
  const text = await uiText(page);
  expect(text.match(CJK), text).toBeNull();
});

test('記一組後，單位和提示是英文，單複數正確', async ({ page }) => {
  await openApp(page);
  await page.locator('#log').click();
  await expect(page.locator('#toast')).toHaveText('Pull-ups 8 reps — logged');
  await expect(page.locator('header .sum')).toHaveText('8 reps · 1 set');
  await expect(page.locator('#todayDay .tot')).toHaveText('8reps · 1 set');
  await page.locator('#log').click();
  await expect(page.locator('header .sum')).toHaveText('16 reps · 2 sets');
});

test('拉力帶在組數方塊上寫成短的 −15lb，提示裡寫完整的 band', async ({ page }) => {
  await openApp(page);
  await page.locator('#load button[data-m="band"]').click();
  await page.locator('#kg').fill('15');
  await page.locator('#log').click();
  await expect(page.locator('#toast')).toHaveText('Pull-ups 8 reps (band 15lb) — logged');
  await expect(page.locator('#todayDay .set')).toHaveText('8−15lb');
  await expect(page.locator('#todayDay .set')).toHaveAttribute('aria-label', '8 reps band 15lb, tap to edit');
});

test('已經存在的動作名稱不會被翻譯', async ({ page }) => {
  await openApp(page, { version: 3, exercises: ['單槓'], days: {} });
  await expect(page.locator('#chips .chip').first()).toHaveText('單槓');
  await expect(page.locator('#log')).toHaveText('Log a set · 單槓');
  await expect(page.locator('h2').first()).toHaveText('Today');
});

test('可以手動切成中文，重新整理後還記得', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('.lang button[data-lang="en"]')).toHaveClass(/on/);
  await page.locator('.lang button[data-lang="zh"]').click();
  await expect(page.locator('h2').first()).toHaveText('今天');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  // Nothing logged yet, so the starter exercises switch language too.
  await expect(page.locator('#chips .chip')).toHaveText(['單槓', '伏地挺身', '編輯']);

  await page.reload();
  await expect(page.locator('h2').first()).toHaveText('今天');
  await expect(page.locator('.lang button[data-lang="zh"]')).toHaveClass(/on/);
});

test('記過之後才切換語言，動作名稱不會變', async ({ page }) => {
  await openApp(page);
  await page.locator('#log').click();
  await page.locator('.lang button[data-lang="zh"]').click();
  await expect(page.locator('#chips .chip')).toHaveText(['Pull-ups', 'Push-ups', '編輯']);
  await expect(page.locator('#log')).toHaveText('記一組　Pull-ups');
});

test('英文的 CSV 欄位名稱', async ({ page }) => {
  await openApp(page);
  await page.locator('#load button[data-m="add"]').click();
  await page.locator('#kg').fill('5');
  await page.locator('#log').click();
  await page.locator('#exportCsv').click();
  await expect(page.locator('#exportTitle')).toHaveText('Export CSV');
  const lines = (await page.locator('#exportBox').inputValue()).replace(/^\ufeff/, '').split(/\r?\n/);
  expect(lines[0]).toBe('"Date","Exercise","Reps","Load","Weight","Unit","Time"');
  expect(lines[1]).toMatch(/^"\d{4}-\d\d-\d\d","Pull-ups","8","added","5","lb","\d\d:\d\d"$/);
});

test('加到主畫面時，名稱是 Workout Log', async ({ page, request }) => {
  await page.goto(SERVER_URL);
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Workout Log');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const m = await (await request.get(new URL(href, SERVER_URL).href)).json();
  expect(m.name).toBe('Workout Log');
  expect(m.lang).toBe('en');
  const zh = await (await request.get(SERVER_URL + 'manifest.webmanifest')).json();
  expect({ ...m, name: 0, short_name: 0, lang: 0 }).toEqual({ ...zh, name: 0, short_name: 0, lang: 0 });
});

test('中英文的文字項目一樣多，沒有漏翻', async ({ page }) => {
  await openApp(page);
  const [zh, en] = await page.evaluate(() => [Object.keys(I18N.strings.zh).sort(), Object.keys(I18N.strings.en).sort()]);
  expect(en).toEqual(zh);
  const used = await page.evaluate(() => [...document.querySelectorAll('[data-i18n],[data-i18n-aria],[data-i18n-ph]')]
    .flatMap(e => [e.dataset.i18n, e.dataset.i18nAria, e.dataset.i18nPh]).filter(Boolean));
  expect(used.filter(k => !zh.includes(k))).toEqual([]);
});
