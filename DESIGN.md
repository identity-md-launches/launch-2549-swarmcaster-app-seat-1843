# GenkiAI design

## Overview

GenkiAI is a private-server AI workspace for teams. The page introduces the product, sends visitors to rsi.am, explains its three main features and workflow, and provides six resource links. Its visual idea is a large green wordmark on a quiet dark surface, with one filled green primary action and a faint green glow at the upper right.

The implemented source is `index.html` and `src/styles.css`. The page is semantic HTML with no client JavaScript or component framework. Components below are reusable HTML/CSS patterns, rather than exported library APIs. The page arrangement is specific to this landing page.

## Colors

All palette primitives and semantic aliases live in `src/styles.css` under `:root`. Hex values are canonical. The required dark appearance is the only theme.

| Semantic token | Primitive / value | Use |
| --- | --- | --- |
| `--color-bg` | `--neutral-950` / `#0d0f13` | Page background |
| `--color-surface` | `--neutral-900` / `#14181d` | Feature cards |
| `--color-border` | `--neutral-750` / `#293139` | Card structure, separators, step outlines |
| `--color-text` | `--neutral-100` / `#e8ebef` | Headings and resource links |
| `--color-text-secondary` | `--neutral-400` / `#a3acb8` | Descriptions, supporting details, footer |
| `--color-brand` | `--green-400` / `#34d3a6` | Wordmark and decorative icons |
| `--color-action` | `--green-400` / `#34d3a6` | Primary link background |
| `--color-action-hover` | `--green-300` / `#66e2bd` | Primary link hover background |
| `--color-action-text` | `--neutral-950` / `#0d0f13` | Text on green fills |
| `--color-focus` | `--green-300` / `#66e2bd` | Keyboard focus ring |

The glow is `radial-gradient(ellipse at 100% 0%, rgb(52 211 166 / 0.085), transparent 68%)`, limited to 850 px wide and 720 px high. It has `pointer-events: none`. Green denotes the brand as explicitly requested, as well as the main action; button shape and placement distinguish the action from decoration. There are no status colors or unused theme ramps.

Rendered text/background sampling at 390 and 1440 px found a minimum **7.767:1** contrast for secondary text on cards. The primary button pair measures **10.060:1**. The green wordmark over the glow measures at least **9.213:1** in the sampled mobile rendering. These measurements describe the captured default states; see `artifacts/contrast.json` and validation limits for hover and forced-color states.

## Typography

`--font-sans` is `Arial, Helvetica, sans-serif`. Fonts come from the visitor's system; no font files or external font service are loaded. Computed styles request Arial in the reviewed browsers; platform fallback and glyph rasterization may vary. Only weights 400 and 700 are used.

| Token / role | Desktop | At ≤35rem | Line height / tracking |
| --- | --- | --- | --- |
| `--text-small` | 0.875rem / 14px | Same | Inherits 1.6; natural tracking |
| `--text-body` | 1rem / 16px | Same | 1.6; natural tracking |
| `--text-card` | 1.375rem / 22px | Same | Card and step headings 1.4; cards −0.025em |
| `--text-section` | 2rem / 32px | 1.75rem / 28px | 1.2; −0.035em |
| `--text-heading` | 3rem / 48px | 2.25rem / 36px | 1.14, mobile 1.2; −0.035em |
| `--text-brand` | `clamp(4.5rem, 13.1vw, 10rem)` | `min(17.8vw, 6rem)` | 1; −0.065em |

There are six size roles at each viewport. The wordmark is intentionally larger than the main heading to honor the brief. `h1` contains the supplied product heading; feature titles are `h2`; workflow and links titles are `h2`, with `h3` for steps.

Headings use `text-wrap: balance` and `overflow-wrap: break-word`; paragraphs use `text-wrap: pretty`. The main heading is capped at 17ch, increased to 22ch at the intermediate layout. Supporting text is bounded at 35ch/44ch in the hero and 31ch/34ch in workflow steps. Card text gets a 64ch cap when stacked. No text is clipped, line-clamped or ellipsized. Text remains selectable; selection uses dark ink on the brand green.

## Layout

`.container` provides the shared edges: maximum outer width 1200 px, centered, with 32 px inline padding, reduced to 24 px on small screens. Safe-area insets can increase this padding. No navigation or action is fixed or sticky.

Spacing tokens `--space-1` through `--space-7` are **8, 16, 24, 32, 48, 64, 96 px** at the default root size. At ≤35rem, `--space-7` becomes 64 px. Components mostly use these tokens. Button padding is 13px × 20px; its icon gap is `min(48px, 6vw)` so enlarged labels still fit.

| Breakpoint | Implemented changes |
| --- | --- |
| Above 65rem / 1040px | Wordmark and navigation share a row. Hero is a 1.5:1 grid. Three feature cards and three workflow steps. Links use a 1:1.2 split with a two-column resource grid. Footer uses a row. |
| ≤65rem / 1040px | Navigation moves below the wordmark; card padding becomes 24px; headings reserve four lines; some gaps reduce. |
| ≤51rem / 816px | Hero and feature cards stack. Card heading minimum height is removed. Links intro stacks above resources; footer stacks. Workflow keeps three columns while it fits. |
| ≤35rem / 560px | Smaller type and spacing tokens; 24px page margins; workflow becomes a vertical numbered sequence; resource links become full-width rows with at least 60px height. |

The hero's single-column grid uses `minmax(0, 1fr)` to let text and controls shrink within the available width. Text containers have no fixed heights. The mobile wordmark is viewport-sized, avoiding a rem-based minimum that would overflow with enlarged text.

The links introduction keeps a real whitespace separator before its desktop line break, so hiding that break in the stacked layout preserves separate sentences.

Rendered reflow was checked at 320, 390, 768, 1040 and 1440 px; the 390 px view was also checked with the root text size doubled. Full coverage and browser-specific evidence are in `artifacts/validation.md`. These tests do not represent every possible width, native zoom or physical-device safe-area behavior.

## Elevation & Depth

The interface is flat. Cards use a darker tonal surface and a 1px structural border. Resource rows and section boundaries use the same border token. There are no box shadows, elevated overlays or nested cards. The background glow provides the only diffuse depth treatment; it sits behind the content.

## Shapes

`--radius-card` is 1rem / 16px; `--radius-control` is 0.5rem / 8px. Step markers are outlined 36px circles. Line icons have round caps and joins, use `currentColor`, and are hidden from assistive technology when decorative. Feature icons are 32px; primary arrows are 24px; resource arrows are 20px; the header arrow is 16px. Normal strokes are 1.5px, with a 2px stroke next to the bold primary label.

## Components

| Pattern | Source / classes | Behavior |
| --- | --- | --- |
| Hero | `index.html`, `.hero`, `.hero-header`, `.hero-content` | Brand first, exact supplied product heading, one description, one primary link. |
| Primary link | `.button-primary` | Native anchor to rsi.am; minimum height 54px; green fill; lighter hover on hover-capable devices; keyboard focus ring. |
| Header navigation | `.header-nav` | Two native fragment links; at least 44px high; underline on hover. |
| Feature card | `.feature-card`, `.feature-symbol` | Noninteractive article with decorative icon/number, heading and full description. Three equal-width columns on wide screens, one column when narrow. |
| Workflow | `.steps`, `.step`, `.step-marker` | Ordered list with inline number/title pairs; vertical connectors only on small screens. |
| Resource link | `.resource-link`, `.link-detail` | Whole row is a native link; visible destination name, decorative arrow; underline and brand color on hover. Same-tab navigation. |
| Footer | `.footer` | Required attribution and year; rsi.am link has a 44 × 44px minimum target. |
| Skip link / focus | `.skip-link`, `a:focus-visible` | First tab reveals Skip to content; a 2px focus outline sits 5px outside every link. Forced-colors uses `Highlight`. |

Interactive transitions are limited to named color/background/transform properties, 150ms ease-out, and exist only under `prefers-reduced-motion: no-preference`. The primary link scales to 0.96 while pressed in that mode. There are no entrance animations or autoplay. Native anchors supply keyboard activation, browser history, modified clicks and context menus. This static page has no loading, error, empty, form or dialog state to implement.

## Do's and Don'ts

- Start additional content from `.container`, `.section` and the semantic color/type tokens. Keep new text in normal document flow.
- Use `.button-primary` for the main destination; use the resource-row pattern for peer links. Preserve descriptive visible link names.
- Preserve the required colors, unmodified image files and exact manifest. Keep assets local and URLs relative within the export.
- Reuse the six type roles, two weights and spacing scale. Do not add tracked uppercase section labels, remote fonts, shadows on bordered cards, or nested card surfaces.
- For another static page, start with the metadata and container, add one descriptive `h1`, reuse the relevant patterns, then rebuild and check mobile reflow and keyboard navigation. Add an exported HTML entry if a real new route is needed; this site currently has one page.

## Guidance attribution

Design implementation and review used Jakub Krehel's [Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface), commit `267330e1adfc66a718fb65fa6918c1f06d0a689e` (MIT). This documentation adapts the method in Paul Bakaus's [Impeccable document reference](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md), commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8` (Apache-2.0). The supplied combined license notices are retained in `artifacts/design-guidance-LICENSE.txt`.
