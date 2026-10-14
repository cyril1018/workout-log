// Takes the README screenshots with made-up data, in Chinese and English:
//   node tools/make-screenshots.js   -> docs/screenshot.png, docs/screenshot-en.png
const { chromium } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const URL = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const SHOTS = [
  // [file, locale, pull-ups, push-ups, a weight-type lift]
  ['screenshot.png', 'zh-TW', '單槓', '伏地挺身', '深蹲'],
  ['screenshot-en.png', 'en-US', 'Pull-ups', 'Push-ups', 'Squat'],
];

(async () => {
  const browser = await chromium.launch();
  for (const [file, locale, pull, push, lift] of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light', locale });
    await page.goto(URL);
    await page.evaluate(([pull, push, lift]) => {
      localStorage.clear();
      localStorage.setItem('workoutlog.v1', JSON.stringify({ version: 3, exercises: [pull, push, lift], types: { [lift]: 'weight' }, days: {} }));
    }, [pull, push, lift]);
    await page.reload();
    const log = async (ex, reps, mode, kg) => {
      await page.click(`#chips .chip:has-text("${ex}")`);
      if (mode) await page.click(`#load button[data-m="${mode}"]`);
      if (kg !== undefined) await page.fill('#kg', String(kg));
      await page.fill('#reps', String(reps));
      await page.click('#log');
    };
    await log(pull, 8, 'band', 15);
    await log(pull, 6, 'add', 5);
    await log(push, 20, 'body');
    await log(lift, 5, null, 80);
    await log(lift, 5, null, 80);
    await page.click(`#chips .chip:has-text("${pull}")`);
    await page.click('#load button[data-m="add"]');
    await page.fill('#kg', '5');
    await page.fill('#reps', '6');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(2000); // let the toast fade
    await page.screenshot({ path: path.join(__dirname, '..', 'docs', file) });
    await page.close();
  }
  await browser.close();
  console.log('wrote docs/screenshot.png, docs/screenshot-en.png');
})();
