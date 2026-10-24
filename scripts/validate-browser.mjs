import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Optional module paths let a contributor keep every dependency outside the repository.
const { chromium, webkit } = await import(process.env.GENKIAI_PLAYWRIGHT ?? 'playwright');
const axePath = process.env.GENKIAI_AXE ?? fileURLToPath(import.meta.resolve('axe-core/axe.min.js'));
const root = resolve('dist');
const evidence = resolve('test/scratch/browser');
await mkdir(evidence, { recursive: true });
const mime = { '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (!path.startsWith('/preview/')) { response.writeHead(404).end(); return; }
    const file = resolve(root, '.' + decodeURIComponent(path.slice('/preview'.length)), path.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, '0.0.0.0', done));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const report = { url, engines: [], limitations: [] };
const failures = [];
let inspectedServer = false;

const expectedLinks = [
  ['Docs', 'https://rsi.am/docs/'],
  ['Live replay', 'https://rsi.am/demo'],
  ['System map', 'https://rsi.am/architecture'],
  ['iPhone beta', 'https://testflight.apple.com/join/duygSPyx'],
  ['X @rsi_am', 'https://x.com/rsi_am'],
  ['Email i@rsi.am', 'mailto:i@rsi.am'],
];

try {
  const engines = process.argv.includes('--chromium-only') ? [['chromium', chromium]] : [['chromium', chromium], ['webkit', webkit]];
  if (process.argv.includes('--chromium-only')) report.limitations.push('WebKit was explicitly excluded; run without --chromium-only on a host with its system libraries.');
  for (const [name, engine] of engines) {
    let browser;
    try {
      browser = await engine.launch({ headless: true });
    } catch (error) {
      failures.push(`${name} could not launch: ${error.message}`);
      continue;
    }
    try {
      const engineReport = { name, version: browser.version(), viewports: [], accessibility: [], interactions: [] };
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      const external = new Set();
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('response', (response) => { if (response.url().startsWith(url) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      page.on('request', (request) => { if (!request.url().startsWith(new URL(url).origin) && !request.url().startsWith('data:')) external.add(request.url()); });

      for (const [width, height] of [[320, 700], [390, 844], [768, 1024], [1040, 900], [1440, 900]]) {
        await page.setViewportSize({ width, height });
        await page.goto(url, { waitUntil: 'networkidle' });
        const state = await page.evaluate(() => {
          const action = document.querySelector('.button-primary').getBoundingClientRect();
          const heading = document.querySelector('h1').getBoundingClientRect();
          const wordmark = document.querySelector('.wordmark').getBoundingClientRect();
          const targets = [...document.querySelectorAll('a[href]')].filter((link) => !link.classList.contains('skip-link')).map((link) => {
            const box = link.getBoundingClientRect();
            return { text: link.textContent.trim(), width: box.width, height: box.height };
          });
          return {
            width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            action: { top: action.top, bottom: action.bottom },
            heading: { top: heading.top, bottom: heading.bottom },
            wordmark: { top: wordmark.top, bottom: wordmark.bottom },
            targets, scripts: document.scripts.length, forms: document.forms.length,
          };
        });
        assert.ok(state.scrollWidth <= width, `${name}: overflow at ${width}: ${state.scrollWidth}`);
        assert.equal(state.scripts, 0, 'The exported site must not load scripts.');
        assert.equal(state.forms, 0);
        if (width <= 816) {
          const intro = await page.locator('.links-intro p').innerText();
          assert.ok(intro.includes('workspace. See'), 'Hiding the desktop line break must retain a word separator.');
        }
        for (const target of state.targets) assert.ok(target.width >= 24 && target.height >= 24, `${name}: small target ${target.text}`);
        if (width === 390) {
          assert.ok(state.action.top >= 0 && state.action.bottom <= height, 'Main action must be on the first phone screen.');
          assert.ok(state.heading.top >= 0 && state.heading.bottom <= height, 'The product must be on the first phone screen.');
          assert.ok(state.wordmark.bottom <= height);
        }
        engineReport.viewports.push({ width, height, ...state });
        await page.screenshot({ path: `${evidence}/${name}-${width}.png`, fullPage: true });

        if ([390, 1440].includes(width)) {
          await page.addScriptTag({ path: axePath });
          const audit = await page.evaluate(async () => {
            const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
            return { violations: result.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target) })), passes: result.passes.length, incomplete: result.incomplete.map(({ id }) => id) };
          });
          assert.equal(audit.violations.length, 0, `${name} axe violations at ${width}: ${JSON.stringify(audit.violations)}`);
          engineReport.accessibility.push({ width, ...audit });
        }
      }

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(url, { waitUntil: 'networkidle' });
      const focusOrder = ['Skip to content', 'How it works', 'Links', 'Open rsi.am', ...expectedLinks.map(([text]) => text), 'rsi.am'];
      for (const label of focusOrder) {
        await page.keyboard.press('Tab');
        const focus = await page.evaluate(() => {
          const element = document.activeElement;
          const css = getComputedStyle(element);
          return { label: element.textContent.trim().replace(/\s+/g, ' '), outline: css.outlineStyle, width: parseFloat(css.outlineWidth), offset: parseFloat(css.outlineOffset) };
        });
        assert.equal(focus.label, label, `${name}: unexpected keyboard order.`);
        assert.equal(focus.outline, 'solid');
        assert.ok(focus.width >= 2);
        if (label === 'Open rsi.am') await page.screenshot({ path: `${evidence}/${name}-focus.png` });
      }
      engineReport.interactions.push('All 11 links reached in order by keyboard with a 2px focus outline.');

      await page.goto(url);
      await page.keyboard.press('Tab');
      await Promise.all([page.waitForURL(`${url}#main`), page.keyboard.press('Enter')]);
      assert.equal(new URL(page.url()).hash, '#main');
      await page.goto(url);
      await page.getByRole('link', { name: 'How it works', exact: true }).click();
      await page.waitForURL(`${url}#how-it-works`);
      assert.equal(new URL(page.url()).hash, '#how-it-works');
      const workflowTop = await page.locator('#how-it-works').evaluate((element) => element.getBoundingClientRect().top);
      assert.ok(workflowTop >= 0 && workflowTop < 100);
      await page.goto(url);
      await page.locator('.header-nav a[href="#links"]').click();
      await page.waitForURL(`${url}#links`);
      assert.equal(new URL(page.url()).hash, '#links');
      assert.ok(await page.getByRole('link', { name: 'Docs', exact: true }).isVisible());
      engineReport.interactions.push('Skip link and both section navigation links activated successfully.');

      for (const [label, href] of [['Open rsi.am', 'https://rsi.am/'], ...expectedLinks.filter(([, href]) => href.startsWith('https:'))]) {
        await page.goto(url);
        let reached = '';
        await page.route(href, async (route) => {
          reached = route.request().url();
          await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Intercepted destination</title><p>Navigation validation</p>' });
        });
        await Promise.all([
          page.waitForURL(href),
          page.getByRole('link', { name: label, exact: true }).click(),
        ]);
        assert.equal(reached, href);
        await page.unroute(href);
      }
      engineReport.interactions.push('Primary link and all five HTTPS resource links reached their exact destinations (network intercepted).');

      await page.goto(url);
      await page.evaluate(() => {
        document.querySelector('a[href="mailto:i@rsi.am"]').addEventListener('click', (event) => {
          event.preventDefault();
          document.body.dataset.mailActivated = event.currentTarget.href;
        });
      });
      await page.getByRole('link', { name: 'Email i@rsi.am', exact: true }).click();
      assert.equal(await page.locator('body').getAttribute('data-mail-activated'), 'mailto:i@rsi.am');
      engineReport.interactions.push('Email link activation carries mailto:i@rsi.am (mail client not opened).');

      await page.goto(url);
      await page.evaluate(() => document.documentElement.style.fontSize = '200%');
      const enlarged = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('body *')].filter((element) => element.getBoundingClientRect().right > innerWidth).map((element) => ({ tag: element.tagName, class: element.className, right: element.getBoundingClientRect().right })) }));
      assert.ok(enlarged.scroll <= enlarged.width, `${name}: 200% text enlargement overflow: ${JSON.stringify(enlarged)}`);
      await page.screenshot({ path: `${evidence}/${name}-text-200.png`, fullPage: true });
      engineReport.interactions.push('200% text enlargement at 390px reflows without horizontal overflow.');

      assert.deepEqual(errors, [], `${name}: console or resource errors`);
      // Explicit link-test navigations are the only external requests this script allows.
      engineReport.externalRequests = [...external];
      report.engines.push(engineReport);
      await context.close();
    } catch (error) {
      failures.push(`${name}: ${error.stack}`);
    } finally { await browser.close(); }
  }
  report.limitations.push('External service availability is not asserted; HTTPS clicks are intercepted to verify navigation. Email activation does not verify an installed mail client.');
  report.limitations.push('Automated accessibility checks and keyboard tests are not a screen-reader session. No physical iPhone, browser-native zoom, or manual RTL review.');
  report.failures = failures;
  await writeFile(`${evidence}/results.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ engines: report.engines.map(({ name, version, viewports, accessibility, interactions }) => ({ name, version, widths: viewports.map(({ width }) => width), accessibility, interactions })), limitations: report.limitations, failures }, null, 2));
  assert.deepEqual(failures, []);
  if (process.argv.includes('--inspect')) {
    inspectedServer = true;
    await writeFile(`${evidence}/preview.json`, JSON.stringify({ url }) + '\n');
    console.log(`Inspection preview ready: ${url}. Press Enter to close (15-minute maximum).`);
    await new Promise((done) => {
      const timer = setTimeout(done, 15 * 60 * 1000);
      process.stdin.once('data', () => { clearTimeout(timer); done(); });
      process.on('SIGTERM', () => { clearTimeout(timer); done(); });
    });
    process.stdin.pause();
    process.stdin.unref?.();
  }
} finally {
  await new Promise((done) => server.close(done));
  if (inspectedServer) console.log('Inspection preview closed.');
}
