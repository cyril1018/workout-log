const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  use: {
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    locale: 'zh-TW',
  },
});
