# Phase 1, first slice: design

Date: 2026-11-20. Approved by Taral in chat ("Yes, that slice").
Full design: the Tintelix HLD and LLD (Claude Docs). This note records only what this slice builds and the calls made for it.

## Intent

Phase 1 is the Learn MVP: 20 System Design lessons, their cheatsheets and PDFs, a phone layout, Home and the Components pages. No accounts and no database; progress stays on the device.

The Caching prototype (one 75 KB HTML file) proved the animation engine. This slice turns it into the repository the HLD describes, with one lesson working end to end, so the other 19 lessons become mostly content.

## Goals

- A pnpm monorepo: `apps/web` (Next.js 16, App Router, every page pre-rendered), `packages/schema`, `packages/stage`, `packages/store`, `packages/theme`, `content/`.
- The Caching lesson ("Survive the flash sale") end to end: six steps, play/pause/replay/speed, keyboard control, the hit-rate control, the live numbers, the load chart and its cheatsheet.
- Home, the System Design subject page (all 20 lessons listed, only Caching open), and Components with the five blocks Caching uses.
- Progress saved on the device (IndexedDB): last step reached per lesson, finished lessons, theme choice.
- Two themes from one set of tokens: Warm (default, as the HLD proposes) and Blueprint.
- Checks: type-check, lint, Vitest unit tests, and a content check that fails the build when step text quotes a number the model does not produce.
- `vercel.json` with functions pinned to `bom1`.

## Non-goals (later slices)

The other 19 lessons, predict-then-test questions, presets, PDFs, search, Practice, Design Lab, sign-in, sync, analytics, the phone portrait scene layout (the stage scales down instead), GitHub Actions.

## Anti-goals

- Numbers on screen that disagree with the text. Every number comes from the lesson's model.
- An engine that only Caching can use. Generic parts (geometry, camera, loop, effects, packets, queues) stay apart from Caching's routing.

## Approaches considered

1. **Port the prototype into packages, Caching behaviour as a plug-in (chosen).** The engine keeps the proven rendering and simulation; the lesson supplies its scene (nodes, wires), model and a small router that decides where each request goes. Fast to reach a working lesson, and the generic parts are reusable.
2. **Write a fully declarative engine first.** Routes, effects and widgets all described as data. Cleanest in theory, but designing it before a second lesson exists means guessing.
3. **Wrap the prototype as-is in a React page.** Fastest, but leaves one 1,000-line file and nothing reusable.

## Calls made for this slice (Claude's, open to change)

- Packages export TypeScript source; Next.js compiles them with `transpilePackages`. No build step per package.
- The engine is framework-free TypeScript (`createPlayer(lesson, host)`); `apps/web` wraps it in one React component.
- Plain CSS with CSS custom properties from `packages/theme`; no CSS framework, so the prototype's styles carry over.
- Fonts are self-hosted from `@fontsource` packages (Inter, Bricolage Grotesque, IBM Plex Mono).
- The Caching model follows the LLD formula, plus the prototype's rule that p95 equals a cache hit once fewer than 5% of requests miss, because step 3's text says so.
- Step text is plain text with `{output}` placeholders and `**bold**`; no HTML in content.
- Components live in `content/components/*.json` for now (YAML later if authors prefer it).
- `idb` for IndexedDB access.

## Left to the builder

Exact CSS, file splits inside packages, and test names.
