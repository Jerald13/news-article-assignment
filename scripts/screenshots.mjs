/**
 * Regenerate the README screenshots.
 *
 *   npm run screenshots        (with `npm run dev` already running)
 *
 * Committed rather than taken by hand so the images can be reproduced after a
 * UI change instead of quietly going stale — an earlier set had leftover
 * end-to-end test rows baked into them, which is exactly the failure this
 * prevents.
 *
 * It refuses to run against a database containing test rows, because those
 * would end up in the images.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';

const WEB = 'http://localhost:5173';
const API = 'http://localhost:3001/api';
const OUT = fileURLToPath(new URL('../docs/screenshots', import.meta.url));

const shots = [];
const record = (name) => shots.push(name);

async function main() {
  mkdirSync(OUT, { recursive: true });

  const probe = await fetch(`${API}/articles?limit=100`).catch(() => null);
  if (!probe?.ok) {
    throw new Error(`API not reachable at ${API}. Start it with: npm run dev`);
  }

  const { data, meta } = await probe.json();
  const polluted = data.filter((a) => /^E2E |E2E Wire Service/.test(`${a.title} ${a.publisher}`));
  if (polluted.length) {
    throw new Error(
      `${String(polluted.length)} end-to-end test rows are in the database; they would appear in ` +
        `the screenshots.\nReset it first: stop the dev server, delete packages/api/data, restart.`,
    );
  }
  console.log(`database looks clean — ${String(meta.total)} seeded articles`);

  const browser = await chromium.launch();

  // ---- desktop ----------------------------------------------------------
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  const page = await desktop.newPage();

  // 1. the list
  await page.goto(`${WEB}/articles`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/list-page.png` });
  record('list-page.png');

  // 2. the form, showing validation on every field
  await page.goto(`${WEB}/articles/new`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Create article' }).click();
  await page.getByText('Article title is required').waitFor();
  // Blur so no field carries a focus ring, which would read as "this one is special".
  await page.locator('body').click({ position: { x: 1200, y: 700 } });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${OUT}/form-validation.png`,
    clip: { x: 0, y: 0, width: 1440, height: 800 },
  });
  record('form-validation.png');

  // 3. the delete confirmation
  await page.goto(`${WEB}/articles`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const first = (await page.getByRole('article').getByRole('heading').allInnerTexts())[0];
  await page.getByRole('button', { name: `Actions for ${first}` }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${OUT}/delete-dialog.png`,
    clip: { x: 0, y: 0, width: 1440, height: 700 },
  });
  record('delete-dialog.png');
  await page.getByRole('button', { name: /cancel/i }).click(); // never actually delete
  await desktop.close();

  // ---- phone ------------------------------------------------------------
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const small = await phone.newPage();
  await small.goto(`${WEB}/articles`, { waitUntil: 'networkidle' });
  await small.waitForTimeout(600);
  await small.screenshot({ path: `${OUT}/list-mobile.png` });
  record('list-mobile.png');
  await phone.close();

  await browser.close();
  console.log(`\nwrote ${String(shots.length)} screenshots to docs/screenshots:`);
  shots.forEach((s) => console.log(`  ${s}`));
}

await main();
