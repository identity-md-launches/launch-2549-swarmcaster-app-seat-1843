import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const root = resolve('dist');
const html = await readFile(join(root, 'index.html'), 'utf8');
const expectedManifest = '{"miniapp":{"version":"1","name":"GenkiAI","subtitle":"AI workspace for teams","description":"Run Claude Code and Codex for your whole team on a private server. Each project is a repo plus a team chat, and a queue fixes, reviews and verifies the work.","homeUrl":"https://genkiai.sites.imd.fun/","iconUrl":"https://genkiai.sites.imd.fun/icon.png","splashImageUrl":"https://genkiai.sites.imd.fun/icon.png","splashBackgroundColor":"#0d0f13","primaryCategory":"productivity","tags":["ai","agents","claude","codex","teams"]}}';

assert.match(html, /<html lang="en">/);
assert.equal((html.match(/<h1\b/g) ?? []).length, 1, 'There must be one main heading.');
assert.match(html, /<title>GenkiAI[^<]+<\/title>/);
for (const name of ['description', 'og:title', 'og:image']) {
  assert.ok(html.includes(`="${name}" content="`), `Missing ${name} metadata.`);
}
assert.match(html, /rel="icon"[^>]+href="\.\/icon\.png"/);
assert.match(html, /property="og:image" content="\.\/og\.png"/);
assert.doesNotMatch(html, /<script\b|<form\b|<input\b|<iframe\b|@font-face/i);
assert.doesNotMatch(html, /https?:\/\/[^"'\s<>]+\.(?:js|css|woff2?)(?:["'?\s<>])/i);

const requiredText = [
  'GENKIAI',
  'AI workspace for teams, on your own server',
  "From design to launch, your team's whole workflow in one place.",
  'Open rsi.am',
  'Web and iPhone, on your own cloud server',
  'Several Claude and Codex accounts, one click to switch',
  'Bugs and features in a queue, fixed, reviewed and verified',
  'How it works',
  'Chat', 'Decide', 'Progress',
  'IMD seat 1843 is run from a GenkiAI project.',
  'GenkiAI · 2026 · ',
];
for (const text of requiredText) assert.ok(html.includes(text), `Missing copy: ${text}`);
assert.ok(html.indexOf('class="features"') < html.indexOf('id="how-it-works"'));
assert.ok(html.indexOf('id="how-it-works"') < html.indexOf('id="links"'));
assert.ok(html.indexOf('id="links"') < html.indexOf('class="footer"'));

const requiredDestinations = [
  'https://rsi.am', 'https://rsi.am/docs/', 'https://rsi.am/demo',
  'https://rsi.am/architecture', 'https://testflight.apple.com/join/duygSPyx',
  'https://x.com/rsi_am', 'mailto:i@rsi.am',
];
for (const href of requiredDestinations) assert.ok(html.includes(`href="${href}"`), `Missing link: ${href}`);

const refs = [...html.matchAll(/(?:href|src)="([^\"]+)"/g)].map((match) => match[1]!);
for (const ref of refs) {
  if (/^(https:|mailto:|#)/.test(ref)) continue;
  assert.ok(ref.startsWith('./'), `Local URL must be relative: ${ref}`);
  assert.ok((await stat(join(root, ref))).isFile(), `Missing local asset: ${ref}`);
}
for (const match of html.matchAll(/href="#([^\"]+)"/g)) {
  assert.ok(html.includes(`id="${match[1]}"`), `Missing anchor target ${match[1]}`);
}

const hashes: Record<string, string> = {
  'icon.png': 'cba788f16f771738c3d239b102d84a0893ea25c37a87429e06e8bb4476f803d7',
  'og.png': '4f3b7750b67f233a65b2efd4c082a3a2da83c68adf146fdc2e9f2d69a611fd38',
};
for (const [file, expected] of Object.entries(hashes)) {
  const bytes = await readFile(join(root, file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `Wrong ${file} hash.`);
  assert.deepEqual(bytes, await readFile(join('public', file)), `${file} changed during build.`);
}
assert.equal((await readFile(join(root, 'farcaster.json'), 'utf8')).trim(), expectedManifest);
assert.equal((await readFile('public/farcaster.json', 'utf8')).trim(), expectedManifest);

async function exportSize(dir: string): Promise<number> {
  let size = 0;
  for (const file of await readdir(dir, { withFileTypes: true })) {
    assert.ok(!['node_modules', '.cache', '.vite', '.git'].includes(file.name), `Packaging artifact in export: ${file.name}`);
    const path = join(dir, file.name);
    if (file.isDirectory()) size += await exportSize(path);
    else {
      assert.ok(!file.isSymbolicLink(), `Symlink in export: ${path}`);
      assert.ok(!['.tgz', '.map'].includes(extname(path)), `Unnecessary archive or source map: ${path}`);
      size += (await stat(path)).size;
    }
  }
  return size;
}
const bytes = await exportSize(root);
assert.ok(bytes < 8_388_608, 'The export exceeds the complete submission budget.');
console.log(`Export validation passed: required copy, seven destinations, anchors, metadata, relative assets, exact manifest, two SHA-256 hashes. Export: ${bytes.toLocaleString('en-US')} bytes.`);
