const path = require('path');
const { pathToFileURL } = require('url');

const APP_URL = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const SERVER_URL = 'http://127.0.0.1:4173/';  // tests/serve.js, started by playwright.config.js
const KEY = 'workoutlog.v1';

// Opens the app with a clean slate, or with `stored` preloaded into localStorage.
async function openApp(page, stored) {
  await page.goto(APP_URL);
  await page.evaluate(([key, data]) => {
    localStorage.clear();
    if (data) localStorage.setItem(key, JSON.stringify(data));
  }, [KEY, stored || null]);
  await page.reload();
}

async function readStored(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
}

module.exports = { APP_URL, SERVER_URL, KEY, openApp, readStored };
