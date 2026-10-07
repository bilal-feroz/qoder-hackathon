# P.E.K.A. — Predictive Emulator for Kinetic Assessments

A proactive digital twin for underground infrastructure — don't wait for the street to collapse to find out what's wrong beneath it.

---

## The Idea

**P.E.K.A.** is an active digital twin of a city's subsurface utility network. It doesn't just display live data — it constantly simulates future states of hidden assets (water mains, gas lines, sewage conduits) beneath the city streets.

- **Predictive Emulator** — the enterprise-grade term for a digital twin that continuously simulates what happens next.
- **Kinetic Assessments** — the engineering translation for evaluating physical motion, pressure dynamics, structural yields, and real-world impacts under the city streets.

Instead of reacting to catastrophic failures, P.E.K.A. detects degradation early, predicts the failure horizon, weighs the socio-economic blast radius, and orchestrates a repair plan — all before residents ever notice a problem.

---

## The 4-Stage Operational Narrative

This is how the P.E.K.A. engine processes an underground scenario step-by-step:

### 1. DETECT — Subsurface Anomaly Isolation

The emulator constantly ingests live municipal telemetry. When a hidden asset deviates from its baseline, the system isolates the deviation.

- **Physical Indicators:** Pressure dropping 2.7%, localized ground moisture spikes, micro-thermal anomalies.
- **System Action:** P.E.K.A. bypasses surface-level blindspots, cross-references historical consumption maps, and issues an alert:

  ```
  SUBSURFACE ANOMALY DETECTED // Confidence: 93%
  ```

### 2. PREDICT — Kinematic Degradation Modeling

The visualization cuts beneath the city's 3D grid, slicing through utility layers to render the exact coordinates of the compromised asset.

- **The Render:** A high-fidelity, volumetric display of the pipe showing a micro-fissure surrounded by a glowing, spreading fluid-diffusion plume.
- **The Forecast:** Using finite element analysis and stress propagation physics, the system predicts the operational window:

  ```
  CRITICAL FAILURE HORIZON: 36–52 HOURS
  ```

### 3. PRIORITIZE — Socio-Economic Impact Weighting

Before suggesting a physical response, P.E.K.A. weighs the downstream chaotic effects of the failure against the city's active infrastructure matrix. It calculates:

- **Critical Dependencies:** Proximity to operational hospitals, active school zones, and high-density residential hubs.
- **Logistical Friction:** Municipal traffic flow impacts, required road closures, dispatch radius for specialized crews, and material procurement costs.

### 4. PLAN — Deterministic Optimization Execution

The system transitions from an analytical twin to an operational coordinator, generating an automated, auditable deployment playbook.

- **System Output:** `REPAIR PLAN #1`
- **Action Items:** Automatically flags the nearest qualified crew, maps optimized detour routes to mitigate traffic gridlock, places a hold on replacement components in the central municipal inventory, and schedules the excavation to conclude before the 36-hour failure threshold.

---

## Team

| Member |
| ------ |
| Awaiz Ahmed |
| Bilal Feroz |
| Mohammad Umar |
| Fuad Ahmed |

---

# Demo app — UnderGrid *(The city that fixes itself first)*

UnderGrid is a 3D twin of downtown Abu Dhabi with a team of AI agents that look after the pipes and cables under the streets.
They spot a problem early, pick the safest fix, send the right crew and check the result. You decide how much they can do alone.

**Spot → Plan → Fix → Check**

* **Spot** — weak signals (pressure −2.7 %, wet ground, warmer soil) add up to one likely leak under Khalifa Street (93 % sure, could burst in 36–52 h).
* **Plan** — six agents compare fixes (replace, clamp, wait), crews and road closures, and show what they checked.
* **Fix** — valves close, water is sent another way, and Crew 07 drives real streets to the site while everyday traffic flows around it.
* **Check** — pressure is tested, the lesson is saved, and the outcome is compared with doing nothing.

> **Demo.** The streets, buildings, parks and coastline are real (OpenStreetMap). The pipes, sensors, crews, costs and the
> leak are made up. Nothing is connected to a real utility network.

---

## Quick start

Requires Node.js 18+ (tested with Node 24).

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

| URL | What opens |
| --- | --- |
| `/` | Landing page |
| `/#twin` | The 3D twin |
| `/#demo` | The twin, then the one-minute story plays by itself |

**Optional: "Ask the agents" with Qwen.** Copy `.env.example` to `.env.local` and fill in the Alibaba Cloud Model Studio key.
The key stays on the dev/preview server (`/api/ask` in `vite.config.ts`) and never reaches the browser. Without a key the
same box answers from built-in rules.

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build (also serves /api/ask)
npm run typecheck  # TypeScript only
```

---

## What you see

| Area | Purpose |
| --- | --- |
| **Landing page** | What UnderGrid does in one screen, how it works, the agents, the real map, safety, and a link into the twin. |
| **Opening** | A map zoom from the UAE to Abu Dhabi Island to the Al Danah streets, handing over to the 3D twin on the same view (click or any key skips). |
| **Center — 3D twin** | Real downtown Abu Dhabi: ~500 buildings at their real heights, the Corniche and the Gulf, mosques, parks, ~1,300 palms, everyday traffic on the real roads, and five utility networks laid under the real streets. |
| **Left — Sensors** | Pressure, moisture, temperature and network health, the *why* panel during an alert, and the location card with Abu Dhabi time (GST). |
| **Right — Agents** | Autonomy switch (Full auto / With limits / Ask me) and spend limit, the six agents, their decisions with what they compared, the crew board, the approval card when a limit needs a person, and "Ask the agents". |
| **Bottom — Playback** | Play, pause, seek and the story steps. |

---

## Controls

| Action | How |
| --- | --- |
| Orbit / pan / zoom | Left-drag / right-drag / scroll |
| Inspect | Hover buildings (real names from the map), pipes, sensors and areas; click to pin a card |
| Camera presets | Keys **1–5**, reset with **0** |
| See underground | **X** |
| Split the layers | **E** |
| In 48 h | What happens if nobody acts (**F**) |
| Compare outcomes | After the repair: doing nothing vs UnderGrid |
| Story | Play / pause (**Space**), start over (**R**), click the progress bar to seek |

---

## Demo story (~60 s)

| t | Beat |
| --- | --- |
| 0 s | Everything normal |
| 2.5 s | Small changes in area B-12 |
| 10 s | Something is wrong in area B-12 |
| 15 s | Looking under Khalifa Street |
| 22.5 s | Likely water leak, could burst in 36–52 h |
| 29.5 s | Who would be affected: 12,400 people, Al Ahalia Hospital nearby |
| 34 s | The plan; the agents pause here if it is over your spend limit |
| 37.5 s | Valves close, water is sent another way |
| 41.5 s | Crew 07 drives from the utility depot (an 18-minute drive shown fast, camera following) |
| 50.5 s | Crew on site, one lane closed |
| 51.5 s | Broken section replaced |
| 54 s | Pressure test, water back on |
| 56.5 s | Fixed before it broke: AED 5.94M saved |

Everything is a pure function of the story clock, so pause, seek and replay are exact. The agents' decisions are plain
functions too (`src/agents/brain.ts`); Qwen only explains them.

---

## Architecture

```
src/
  app/            Root (landing / twin routes), App shell, hover-card descriptions
  agents/         The agent team, crews, decision rules, facts for "Ask the agents"
  components/
    landing/      Landing page
    ui/           shadcn components (navbar, rail TOC) and small twin UI pieces
    agents/       Agents panel, approval card, Ask box
    dashboard/    Header, sensors rail, location card
    overlay/      Toggles, caption, transport, compare, +48 h, tooltip, boot, map intro
    geo/          SVG map layers for the map intro and location card
  data/
    abudhabi.json Generated from OpenStreetMap (scripts/build-abudhabi.mjs)
    geo.ts        Real places and street names; scene ↔ map transform
  simulation/     Story clock, telemetry, engine, per-frame runtime, crew position
  store/          Zustand store
  three/          Scene: real buildings, ground, sea, palms, mosques, labels, traffic,
                  networks, cut-away, leak, impact zone, crew route, camera rig, effects
```

---

## Technologies

Vite · React 19 · TypeScript · Three.js r186 · @react-three/fiber · @react-three/drei · @react-three/postprocessing ·
Zustand · Tailwind CSS v4 and shadcn components (landing page) · Motion · Lucide · Geist, Instrument Sans and Fragment Mono
(bundled, works offline). Optional: Qwen via Alibaba Cloud Model Studio for "Ask the agents".

### Map data

* Buildings, roads, parks, palms, coastline and place names for the twin — © [OpenStreetMap](https://www.openstreetmap.org/copyright)
  contributors, ODbL. Rebuild with `node scripts/fetch-abudhabi.mjs abudhabi-osm.json` then
  `node scripts/build-abudhabi.mjs abudhabi-osm.json`.
* Country outlines — [Natural Earth](https://www.naturalearthdata.com/) 1:10m (public domain), via `world-atlas`.
  Abu Musa, Greater Tunb and Lesser Tunb are drawn as UAE territory, as on UAE official maps.
* Abu Dhabi coastline and Al Danah streets for the map intro — © OpenStreetMap contributors (Overpass API extract, October 2026).

The attribution is shown in the app.

---

## Simulated data

* **Telemetry** — deterministic baselines plus scripted incident changes.
* **Assets and crews** — pipe routes, IDs, crews and their skills.
* **Costs and forecasts** — AED 660K to fix early, AED 6.6M if it bursts, 36–52 h window, 93 % confidence.

These figures are illustrative and not measurements.

---

## Deployment

A static build (`npm run build`, output `dist/`) works on Vercel, Cloudflare Pages or any static host. On a static host
"Ask the agents" uses its built-in answers, since `/api/ask` runs on the Vite dev/preview server.

For the best demo on a projector: Chrome or Edge with hardware acceleration, 1920×1080 (works down to 1440×900).
