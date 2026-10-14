// Takes the README screenshots with made-up data, in Chinese and English:
//   node tools/make-screenshots.js   -> docs/screenshot.png, docs/screenshot-en.png
const { chromium } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const URL = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const SHOTS = [
  // [file, locale, pull-ups, push-ups, a weight-type lift, band / added / lift weights in that locale's unit]
  ['screenshot.png', 'zh-TW', '單槓', '伏地挺身', '深蹲', [15, 5, 80]],
  ['screenshot-en.png', 'en-US', 'Pull-ups', 'Push-ups', 'Squat', [30, 10, 135]],   // lb
];

(async () => {
  const browser = await chromium.launch();
  for (const [file, locale, pull, push, lift, [band, added, heavy]] of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light', locale });
    await page.goto(URL);
    const unit = locale === 'en-US' ? 'lb' : 'kg';
    await page.evaluate(([pull, push, lift, unit]) => {
      localStorage.clear();
      localStorage.setItem('workoutlog.v1', JSON.stringify({ version: 4, unit, exercises: [pull, push, lift], types: { [lift]: 'weight' }, days: {} }));
    }, [pull, push, lift, unit]);
    await page.reload();
    const log = async (ex, reps, mode, kg) => {
      await page.click(`#chips .chip:has-text("${ex}")`);
      if (mode) await page.click(`#load button[data-m="${mode}"]`);
      if (kg !== undefined) await page.fill('#kg', String(kg));
      await page.fill('#reps', String(reps));
      await page.click('#log');
    };
    await log(pull, 8, 'band', band);
    await log(pull, 6, 'add', added);
    await log(push, 20, 'body');
    await log(lift, 5, null, heavy);
    await log(lift, 5, null, heavy);
    await page.click(`#chips .chip:has-text("${pull}")`);
    await page.click('#load button[data-m="add"]');
    await page.fill('#kg', String(added));
    await page.fill('#reps', '6');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(2000); // let the toast fade
    await page.screenshot({ path: path.join(__dirname, '..', 'docs', file) });
    await page.close();
  }
  await browser.close();
  console.log('wrote docs/screenshot.png, docs/screenshot-en.png');
})();
