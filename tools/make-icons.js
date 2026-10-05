// Draws the app icon (pixel-art monkey hanging one-handed from a pull-up bar)
// and writes every icon size the manifest and index.html use.
//   node tools/make-icons.js            -> writes icons/
//   node tools/make-icons.js <dir>      -> writes to <dir> instead (for previews)
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// 32×32 sprite. Outline pixels (O) are added automatically around the monkey.
const SPRITE = [
  '................................',
  '................................',
  '.......................LLL......',
  '..BBBBBBBBBBBBBBBBBBBBBLLLLBBB..',
  '..bbbbbbbbbbbbbbbbbbbbbLLLLbbb..',
  '..pp....................MM..pp..',
  '..pp....................MM..pp..',
  '..pp.......MMMMMM......MM...pp..',
  '..pp.....MMMMMMMMMM....MM...pp..',
  '..pp....MMMMMMMMMMMM...MM...pp..',
  '..pp....MMLLLMMLLLMM...MM...pp..',
  '..pp..MMMMLKLLLLKLMMMM.MM...pp..',
  '..pp..MLMMLLLLLLLLMMLM.MM...pp..',
  '..pp..MMMLLLLLLLLLLMMM.MM...pp..',
  '..pp....MPLLKLLKLLPM..MM....pp..',
  '..pp....MMLLLKKLLLMM..MM....pp..',
  '..pp.....MMLLLLLLMM..MM.....pp..',
  '..pp......MMMMMMMMMMMM......pp..',
  '..pp.....MMMMMMMMMMMMM......pp..',
  '..pp...MM.MMMLLLLLMMM.......pp..',
  '..pp...MM.MMMLLLLLMMM.......pp..',
  '..pp...MM.MMMLLLLLMMM.......pp..',
  '..pp...MM..MMLLLLLMM........pp..',
  '..pp..LLL..MMMLLLMMMM.......pp..',
  '..pp..LL....MMMMMMM..M......pp..',
  '..pp.........MM..MM...M.....pp..',
  '..pp.........MM..MM...M.....pp..',
  '..pp.........MM..MM..M......pp..',
  '..pp........LLL..LLL........pp..',
  '..pp........................pp..',
  '..pp........................pp..',
  '..pp........................pp..',
];
const COLORS = {
  '.': '#1E4FE0',   // background: the app's accent blue
  B: '#EEF1F7', b: '#AEB8CF', p: '#C7CEDD',   // bar, bar shadow, posts
  M: '#A0612F', L: '#F3C995',                 // fur, face/belly/hands
  K: '#3A2314', P: '#FF8FA3', O: '#3A2314',   // eyes/mouth, cheeks, outline
};
const BODY = new Set(['M', 'L', 'K', 'P']);

function withOutline(rows) {
  const g = rows.map(r => r.split(''));
  const out = g.map(r => r.slice());
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (BODY.has(g[y][x])) continue;
    const near = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => BODY.has((g[y + dy] || [])[x + dx]));
    if (near) out[y][x] = 'O';
  }
  return out;
}

// SVG with one rect per horizontal run of equal colour, scaled `cell` px per pixel and
// centred on a `size` canvas filled with the background colour.
function svg(size, cell) {
  const grid = withOutline(SPRITE);
  const off = (size - 32 * cell) / 2;
  let rects = '';
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32;) {
      const c = grid[y][x]; let w = 1;
      while (x + w < 32 && grid[y][x + w] === c) w++;
      if (c !== '.') rects += `<rect x="${off + x * cell}" y="${off + y * cell}" width="${w * cell}" height="${cell}" fill="${COLORS[c]}"/>`;
      x += w;
    }
  }
  // When the sprite is smaller than the canvas, run the posts down to the bottom edge.
  const bottom = off + 32 * cell;
  if (bottom < size) {
    grid[31].forEach((c, x) => {
      if (c === 'p') rects += `<rect x="${off + x * cell}" y="${bottom}" width="${cell}" height="${size - bottom}" fill="${COLORS.p}"/>`;
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`
    + `<rect width="${size}" height="${size}" fill="${COLORS['.']}"/>${rects}</svg>`;
}

const OUTPUTS = [
  // [file, canvas size, px per sprite pixel]
  ['icon-512.png', 512, 16],
  ['icon-192.png', 192, 6],
  ['maskable-512.png', 512, 10],     // smaller so Android's circle/squircle crop keeps the monkey
  ['apple-touch-icon.png', 180, 5],
  ['favicon-32.png', 32, 1],
];

(async () => {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'icons'));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'icon.svg'), svg(32, 1));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [file, size, cell] of OUTPUTS) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<body style="margin:0">${svg(size, cell)}</body>`);
    await page.screenshot({ path: path.join(dir, file), clip: { x: 0, y: 0, width: size, height: size } });
  }
  await browser.close();
  console.log('wrote', dir);
})();
