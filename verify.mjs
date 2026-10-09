// Builds nothing; serves dist/ three times (no delay, lodash prebuild chunk delayed, merged loadShare chunk delayed)
// and reads the page result through an installed Chrome. Run `npm run build` first.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const scenarios = [
  { name: 'no delay', delays: [] },
  { name: 'lodash prebuild +1500ms', delays: ['prebuild__lodash__prebuild=1500'] },
  // Control: hold back the merged loadShare chunk instead, so lodash's prebuild is cached before the wrapper evaluates.
  { name: 'control: merged loadShare chunk +1500ms', delays: ['loadShare__shared=1500'] },
];

async function launch() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return chromium.launch({ headless: true }); // after `npx playwright install chromium`
  }
}

const browser = await launch();
let port = 4300;
for (const scenario of scenarios) {
  port += 1;
  const serverArgs = ['serve.mjs', '--port', String(port), ...scenario.delays.flatMap((d) => ['--delay', d])];
  const server = spawn(process.execPath, serverArgs, { stdio: ['ignore', 'ignore', 'inherit'] });
  await new Promise((r) => setTimeout(r, 300));
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.__REPRO__ !== undefined, null, { timeout: 8000 }).catch(() => {});
  const result = await page.evaluate(() => window.__REPRO__ ?? null);
  console.log(`\n## ${scenario.name}`);
  console.log('result:', JSON.stringify(result));
  console.log('errors:', errors.length ? JSON.stringify(errors, null, 2) : 'none');
  await page.close();
  server.kill();
}
await browser.close();
