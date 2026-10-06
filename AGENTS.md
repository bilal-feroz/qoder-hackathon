# Pioneer city twin (Vite + React + three.js)

- Dev: `npm run dev` (http://localhost:5173) · Types: `npm run typecheck` · Build: `npm run build`
- Routes (hash): `/` landing page, `/#twin` the 3D twin, `/#demo` the twin with the story auto-playing (`src/app/Root.tsx`).
- UI copy rule: plain words for non-experts; no all-caps labels. Pioneer tokens live in `src/styles/tokens.css`, overrides in `src/styles/pioneer.css`, agents panel styles in `src/styles/agents.css`, maps in `src/styles/geo.css`.

## Tailwind + shadcn (landing page only)

- Tailwind v4 via `@tailwindcss/vite`; entry `src/styles/tailwind.css`. No preflight (the twin keeps its own reset), utilities unlayered, and `source(none)` + explicit `@source` so only `src/components/ui` and `src/components/landing` are scanned. Keep twin class names out of those folders' Tailwind namespace.
- shadcn semantic colours (`bg-background`, `text-muted-foreground`, …) map onto Pioneer tokens in `tailwind.css`; don't add a second palette. Pioneer radius tokens are `--radius-panel/card/chip` (renamed so Tailwind's `rounded-lg` keeps its own scale).
- `components.json` is set up (alias `@/` → `src/`). The shadcn CLI ran out of memory on the dev machine and tried to install an npm package literally named `cn`; registry items were installed by hand from their registry JSON instead (`rail-toc` from swamimalode07/rare-ui, `springs` from Fluid Functionalism). Check what a registry item installs before running `add`.
- Motion tokens: `@/lib/springs` (fast / moderate / slow). The app root is wrapped in `MotionConfig reducedMotion="user"`.
- The landing scroll container is `.landing` (body never scrolls); scoped preflight in `src/components/landing/landing.css` uses `:where()` so utilities always win.

## Real map (downtown Abu Dhabi)

- `src/data/abudhabi.json` is generated, do not hand-edit. Rebuild it with:
  `node scripts/fetch-abudhabi.mjs abudhabi-osm.json` then `node scripts/build-abudhabi.mjs abudhabi-osm.json`.
  The Overpass server is often busy; the fetch script retries.
- The build rotates the map (never mirrors it) so Khalifa Street runs along z = 0 through the origin, where the demo leak is. The Corniche sea is on +z. 1 unit = 10 m.
- `src/data/geo.ts` holds the exact scene ↔ lon/lat inverse of that build; the map intro and location card (from the Al Danah reframe) rely on it, so change both together.
- Map data © OpenStreetMap contributors (ODbL) · Natural Earth. Keep the on-screen credit (`MAP_CREDIT`).
- Streets, buildings, parks and the coast are real. Pipes are laid under real streets (`src/data/networks.ts`), but their routes, the sensors, the crews and the incident are made up.
- Money is in AED (`formatMoney`).

## Agents

- Decisions are pure functions in `src/agents/brain.ts` (team in `team.ts`, crews in `crews.ts`), so pause/seek/replay stay exact.
- Autonomy: Full auto / With limits (default, AED 1M) / Ask me. The clock holds at the plan (`gateFor`) when the limits need a person; `SimulationDriver` and `seek` both respect the hold.
- "Ask the agents": `POST /api/ask` is a Vite dev/preview middleware in `vite.config.ts`. It sends the run's facts to Qwen (Alibaba Cloud Model Studio) with the key from `.env.local` (`DASHSCOPE_API_KEY`, `DASHSCOPE_BASE_URL`, `QWEN_MODEL`; see `.env.example`). The key never reaches the browser. Without it, `src/agents/ask.ts` answers from built-in rules. Qwen explains; it never approves or changes a decision.

## Crew drive and traffic

- The crew route is the shortest drive on the real street graph (one-way streets cost 6×, never through the dig site), offset into the right-hand lane, slowing for corners (`src/data/incident.ts`, `src/three/RepairRoute.tsx`). The camera follows via `src/simulation/crew.ts`.
- Traffic (`src/three/AbuDhabiTraffic.tsx`) keeps right, follows one-way rules, turns at real junctions, avoids the dig site and speeds up during the fast-forwarded drive (`fastForwardAt`).

## Visual QA

- Headless screenshots need real-time waits (shader warm-up). Drive Chrome over CDP and use the dev hooks: `window.__dev.store.getState()` (`setBoot('ready')`, `run()`, `seek(t)`, `setSpendLimit(v)`), `__dev.runtime.t`, `__mapIntroAt(ms)` for the map intro.
