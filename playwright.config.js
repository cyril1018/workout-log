const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 10000,
  expect: { timeout: 3000 },
  webServer: {
    command: 'node tests/serve.js 4173',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: true,
  },
  use: {
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    locale: 'zh-TW',
    actionTimeout: 3000,
  },
});
