// Renders the home-screen icons (a T-Rex in a digger) with the game's own drawing code.
// Run: node tools/make-icons.mjs  (needs playwright; see tests/smoke.mjs for env vars)
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chromium = pw.chromium || pw.default.chromium;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
await page.waitForTimeout(300);
for (const size of [180, 192, 512]) {
  const data = await page.evaluate(size => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const k = size / 512;
    c.scale(k, k);
    const g = c.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#6cc6ff'); g.addColorStop(1, '#d4f1ff');
    c.fillStyle = g; c.fillRect(0, 0, 512, 512);
    c.fillStyle = '#5cc84a'; c.fillRect(0, 380, 512, 132);
    c.fillStyle = '#a0662e'; c.fillRect(0, 404, 512, 108);
    c.fillStyle = OUT; c.fillRect(0, 378, 512, 6);
    // Keep the picture inside the central safe zone for maskable icons.
    c.translate(236, 380); c.scale(2.1, 2.1);
    const v = { def: VEHICLE_DEFS.digger, t: 1, wheel: 0, facing: 1, s: { aim: 0, load: [T.DIRT], bx: 86, by: -96 },
      body: { x: 0, y: 0, w: 84, h: 64, vx: 0 }, driver: { type: 'rex' }, drawDriver: Vehicle.prototype.drawDriver };
    VEHICLE_DEFS.digger.draw(c, v);
    return cv.toDataURL('image/png').split(',')[1];
  }, size);
  fs.writeFileSync(path.join(root, 'icons', `icon-${size}.png`), Buffer.from(data, 'base64'));
  console.log('wrote icons/icon-' + size + '.png');
}
await browser.close();
