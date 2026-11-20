# Tintelix

Tintelix is an interactive course site. Each lesson is a short story told on a live, animated diagram: you watch a system struggle, change one thing, and see the numbers move.

Two System Design lessons are live: **Caching ("Survive the flash sale")** and **CDN ("Serve Mumbai from Mumbai")**. Around them are Home, the System Design subject page, the Components browser and a printable cheatsheet per lesson. Six more subjects (Computer Networks, APIs, Linux, Microservices, SQL, DSA) are listed as coming later.

## Repo layout

```
apps/web            Next.js 16 App Router site (deployed on Vercel)
  app/              routes: /, /[subject], /[subject]/[slug], /[subject]/[slug]/cheatsheet, /components
  ui/               React components; ui/lesson/ holds the lesson page parts
  e2e/              Playwright smoke test (Python), run against a started server
packages/theme      design tokens for the Warm and Blueprint themes, and the generated theme.css
packages/schema     Zod schemas for subjects, lessons and components; checkContent; number formatting
packages/stage      the animation engine: geometry, camera, request simulation, effects, renderers, createPlayer
packages/store      progress and preferences in IndexedDB (falls back silently when storage is unavailable)
content             subjects, lessons and component cards, as typed data
docs                design notes, plans and the original Caching prototype
```

Packages export TypeScript source. The web app compiles them through `transpilePackages`, so there is no separate package build step.

## Getting started

You need Node 22 or later and pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Other commands, all run from the repo root:

| Command | What it does |
|---|---|
| `pnpm check` | typecheck, lint and every Vitest test |
| `pnpm test` | Vitest only |
| `pnpm build` | content checks, then `next build` |
| `pnpm start` | serve the production build |

The smoke test needs a running server and Python Playwright:

```bash
pnpm build && pnpm start -p 3123
python3 apps/web/e2e/lesson_smoke.py http://localhost:3123
```

## Adding a lesson

A lesson is data plus a small pure model. Its `scene.kind` picks a scene runtime from `packages/stage/src/scenes/index.ts`. The scene owns the routing, node widgets, legend, request rate, queues, chart and tiles; the player, camera, loop, canvases and controls are shared.

- **A lesson on an existing kind of diagram** (`cache-aside`, `cdn`) needs no engine changes.
- **A new kind of diagram** needs a pure router in `packages/stage/src/routers/`, a scene in `packages/stage/src/scenes/`, its name in `SCENE_KINDS` and its `sim.mode` values in `SCENE_MODES` (`packages/schema/src/lesson.ts`).

1. Add a stub for it to the subject's module list in `content/<subject>/subject.ts`.
2. Create `content/<subject>/<slug>/` with:
   - `model.ts`: `run(inputs)` returns the numbers the lesson talks about.
   - `scene.ts`: the nodes and wires on the stage.
   - `steps.ts`: the story. Step text quotes model outputs as `{name}` and may use `**bold**`. It never contains HTML.
   - `cheatsheet.ts`: the one-page summary.
   - `lesson.ts`: puts the parts together.
3. Register the lesson in `content/index.ts`.
4. Run `pnpm test`.

`checkContent` fails the tests, and therefore the build, when:

- a step, note, "What changed" line, control readout or cheatsheet line quotes an output the model does not produce;
- a title is longer than 40 characters;
- a component or `buildsOn` lesson does not exist, or step ids repeat;
- the lesson is missing from its subject, or its slug, topic or title differs from the subject's entry;
- a node lies outside the scene's bounds, or a step names a node that doesn't exist;
- a step uses a `sim.mode` its scene kind doesn't have, or sets something that isn't a model input.

## Deploying on Vercel

- Import the repo and set **Root Directory** to `apps/web`. Vercel installs the whole pnpm workspace.
- `apps/web/vercel.json` pins functions to `bom1` (Mumbai). It lives there because Vercel reads it from the Root Directory.
- The web app's `build` script runs the content checks first, so a broken lesson fails the deploy instead of shipping.
- On the Hobby plan, the site must stay non-commercial. Move to Pro before charging for anything.
