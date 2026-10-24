# GenkiAI

A one-page, English-language website for **GenkiAI**, the AI workspace that runs on a team's own server. Prepared for the IdentityMD site **genkiai**, seat **1843**.

The complete static export is in [`dist/`](dist/). IdentityMD's submission pipeline publishes that export. The page needs no JavaScript, backend, wallet, forms, analytics, remote fonts, or external runtime assets.

## Install, develop, preview, rebuild

Use Node.js **22.18 or later** and npm. Dependency versions are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

To rebuild and preview the production export:

```sh
npm run typecheck
npm run build
npm run preview
```

Open the local URL printed by Vite. `build` replaces `dist/`, then checks the required copy, link destinations, anchor targets, metadata, relative asset references, exact mini app manifest, and both image hashes. Keep the finished `dist/` alongside the source and lockfile in the submission; the publisher serves these files directly.

For a preview with no dependencies installed, serve the existing export with any static HTTP server, for example:

```sh
python3 -m http.server 4173 --directory dist
```

Vite uses `base: './'`. Styles, favicon and share image use relative URLs. Internal navigation uses fragment links, so a gateway subpath works without server rewrites. `farcaster.json` intentionally retains the exact absolute URLs supplied for `https://genkiai.sites.imd.fun/`.

## Browser validation

```sh
npx playwright install chromium webkit
npm run validate:browser
```

On a host without the WebKit system libraries, install Playwright's documented OS dependencies or run `npm run validate:browser -- --chromium-only` and record that reduced coverage. The default command requires both engines and exits unsuccessfully if either cannot run.

The browser validator starts and closes its own local server, serving the export under `/preview/`. It checks five widths in Chromium and WebKit, keyboard order and focus styles, skip/section navigation, actual outbound link activation with intercepted destinations, email activation, 200% text enlargement, axe accessibility results, console errors and resource failures. It writes disposable evidence to `test/scratch/browser/`. `--inspect` holds the bounded foreground preview open for manual inspection; press Enter to close it.

For contributors keeping dependencies outside the repository, `GENKIAI_PLAYWRIGHT` can name Playwright's module and `GENKIAI_AXE` can name `axe.min.js`. An external compiler can run the typecheck with `--typeRoots` pointing to its installed `@types` directory. These are development options; the published page reads no configuration.

## Actual verification results

The production build and TypeScript check passed. Export integrity checks passed, including both exact SHA-256 hashes and the manifest. The final export is approximately **237 KB**. Chromium and WebKit passed the browser validator at all five widths. The pinned `taste@1` probe passed **16/16 checks**, including reflow at 320, 390 and 1440 px. The product and primary action are visible on the first 390 × 844 screen.

Detailed commands, browser results, the six-domain Better Interface review, corrections and limits are recorded in [`artifacts/validation.md`](artifacts/validation.md). [`DESIGN.md`](DESIGN.md) describes the final implementation. Rendered screenshots are included in [`artifacts/mobile-390.png`](artifacts/mobile-390.png) and [`artifacts/desktop-1440.png`](artifacts/desktop-1440.png).

External destination availability, email delivery, physical-device behavior, native browser zoom and screen-reader operation are not certified by these checks. HTTPS navigation tests intercept requests rather than depending on another service's uptime.

## Source and assets

| Path | Purpose |
| --- | --- |
| `index.html` | Complete semantic page, content and share metadata |
| `src/styles.css` | Tokens, components, responsive rules and interaction states |
| `public/icon.png`, `public/og.png` | Unmodified supplied images, copied to the export root |
| `public/farcaster.json` | Exact supplied mini app manifest, copied to the export root |
| `scripts/check-export.ts` | Typed production-export integrity checks |
| `scripts/validate-browser.mjs` | Reproducible browser and interaction checks |
| `dist/` | Complete deployable static website |

The supplied image bytes were downloaded from `https://rsi.am/welcome/apple-touch-icon.png` and `https://rsi.am/welcome/og.png`. Expected hashes:

```text
icon.png  cba788f16f771738c3d239b102d84a0893ea25c37a87429e06e8bb4476f803d7
og.png    4f3b7750b67f233a65b2efd4c082a3a2da83c68adf146fdc2e9f2d69a611fd38
```

Build and browser dependencies, downloaded browsers, package caches and temporary OS libraries were kept outside the delivered tree. No ignore file was added or changed. Review guidance attribution and licenses are in [`DESIGN.md`](DESIGN.md) and [`artifacts/design-guidance-LICENSE.txt`](artifacts/design-guidance-LICENSE.txt).
