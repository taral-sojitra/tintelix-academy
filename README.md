# Tintelix

Tintelix is an interactive course site. Each lesson is a short story told on a live, animated diagram: you watch a system struggle, change one thing, and see the numbers move.

The first slice ships one complete lesson, **System Design → Caching ("Survive the flash sale")**, plus Home, the System Design subject page, the Components browser and a printable cheatsheet. Six more subjects (Computer Networks, APIs, Linux, Microservices, SQL, DSA) are listed as coming later.

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

A lesson is data plus a small pure model. Another cache-aside lesson needs no engine changes.

A lesson with a different kind of diagram does need engine work first. The request routing is already a separate, pure `Router`, but `createPlayer` always builds the cache-aside scene, and the stage markup has the cache, database and app-server widgets and the "DB load" chart built in. Before the second kind of lesson, move the legend, rates, queues, widgets and chart metric behind `SceneRuntime`, and choose the scene by lesson.

1. Add a stub for it to the subject's module list in `content/<subject>/subject.ts`.
2. Create `content/<subject>/<slug>/` with:
   - `model.ts`: `run(inputs)` returns the numbers the lesson talks about.
   - `scene.ts`: the nodes and wires on the stage.
   - `steps.ts`: the story. Step text quotes model outputs as `{name}` and may use `**bold**`. It never contains HTML.
   - `cheatsheet.ts`: the one-page summary.
   - `lesson.ts`: puts the parts together.
3. Register the lesson in `content/index.ts`.
4. Run `pnpm test`.

`checkContent` fails the tests, and therefore the build, when a step quotes an output the model does not produce, a title is longer than 40 characters, a component or `buildsOn` lesson does not exist, step ids repeat, or the lesson is missing from its subject.

## Deploying on Vercel

- Import the repo and set **Root Directory** to `apps/web`. Vercel installs the whole pnpm workspace.
- `apps/web/vercel.json` pins functions to `bom1` (Mumbai). It lives there because Vercel reads it from the Root Directory.
- The web app's `build` script runs the content checks first, so a broken lesson fails the deploy instead of shipping.
- On the Hobby plan, the site must stay non-commercial. Move to Pro before charging for anything.
