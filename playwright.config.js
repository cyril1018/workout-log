const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 10000,
  expect: { timeout: 3000 },
  use: {
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    locale: 'zh-TW',
    actionTimeout: 3000,
  },
});
