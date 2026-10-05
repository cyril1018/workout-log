// Draws the app icon (a monkey doing a pull-up, chin over the bar) and writes every
// icon size the manifest and index.html use.
//   node tools/make-icons.js            -> writes icons/
//   node tools/make-icons.js <dir>      -> writes to <dir> instead (for previews)
// The monkey face is Google's Noto Emoji U+1F435 (tools/monkey-face.svg),
// SIL Open Font License 1.1, see tools/NOTO-EMOJI-LICENSE.txt.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BG = '#1E4FE0', BAR = '#EEF1F7', BAR_SHADOW = '#AEB8CF', FUR = '#B6885A', SKIN = '#FFCD88';

// The emoji, placed as a nested <svg> at (x, y) with side s on the 512 canvas.
function face(x, y, s) {
  return fs.readFileSync(path.join(__dirname, 'monkey-face.svg'), 'utf8')
    .replace(/<\?xml[^>]*>|<!--[\s\S]*?-->/g, '')
    .replace(/<svg[^>]*viewBox="([^"]+)"[^>]*>/, `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="$1">`);
}

function hand(cx) {
  return `<rect x="${cx - 34}" y="330" width="68" height="62" rx="28" fill="${FUR}"/>`
    + `<rect x="${cx - 22}" y="348" width="44" height="30" rx="14" fill="${SKIN}"/>`;
}

// Drawn on a 512 grid, then shrunk by `scale` around the centre. The bar is extra wide
// so it still reaches both edges when shrunk.
function svg(size, scale = 1) {
  const art = face(106, 100, 300)
    + `<rect x="-512" y="342" width="1536" height="38" fill="${BAR}"/>`
    + `<rect x="-512" y="372" width="1536" height="8" fill="${BAR_SHADOW}"/>`
    + hand(132) + hand(380);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">`
    + `<rect width="512" height="512" fill="${BG}"/>`
    + `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${art}</g></svg>`;
}

const OUTPUTS = [
  // [file, size, scale]
  ['icon-512.png', 512, 1],
  ['icon-192.png', 192, 1],
  ['maskable-512.png', 512, 0.78],   // smaller so Android's circle/squircle crop keeps the hands
  ['apple-touch-icon.png', 180, 1],
  ['favicon-32.png', 32, 1],
];

(async () => {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'icons'));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'icon.svg'), svg(512));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [file, size, scale] of OUTPUTS) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<body style="margin:0">${svg(size, scale)}</body>`);
    await page.screenshot({ path: path.join(dir, file), clip: { x: 0, y: 0, width: size, height: size } });
  }
  await browser.close();
  console.log('wrote', dir);
})();
