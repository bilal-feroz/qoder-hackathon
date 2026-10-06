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

# Demo app — AI Infrastructure Guardian *(The City That Heals Itself)*

An interactive, predictive **digital twin of a city's hidden infrastructure**, built with Three.js.
It watches simulated sensor streams for water, electricity, telecom, sewage and district cooling,
notices small anomalies that individually look harmless, correlates them, and then:

**DETECT → PREDICT → PRIORITIZE → PLAN**

* **Detect** — fuses weak signals (pressure −2.7 %, soil moisture +18 %, ground temperature +4 %) into one pattern.
* **Predict** — localizes the source (water main `WTR-B12-04`, 93 % confidence) and forecasts failure in **36–52 h**.
* **Prioritize** — maps who is affected: ~12,400 residents, a hospital 320 m away, a school 480 m away, a road at risk.
* **Plan** — recommends and visualizes the intervention: isolate valves, reroute supply, dispatch a crew, replace the section, pressure-test.

The point of the product: *the city never visibly breaks*, because people act before the pipe fails.

> **Prototype using simulated infrastructure telemetry.** It is not connected to any real municipal network.
> Every sensor value, asset, cost and forecast in this repository is demo simulation.

---

## Quick start

Requires Node.js 18+ (tested with Node 22).

```bash
npm install
npm run dev
```

Open the printed URL (default <http://localhost:5173>). Press **Run failure scenario**.

Other scripts:

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
npm run typecheck  # TypeScript only
```

---

## What you see

| Area | Purpose |
| --- | --- |
| **Center — 3D twin** | Procedural city (56 buildings, roads, park, river, hospital, school, depot, pumping station, substation, cooling plant) sitting on a cut-away soil slab. Beneath it, five utility networks at believable depths with real elbows, junctions, flanges, valves, risers, access shafts and 24 sensors. |
| **Left — Live signals** | Pressure, moisture, temperature and network health with sparklines; during an alert, a compact *why* panel (feature contributions → combined confidence). |
| **Right — AI recommendation** | Monitoring → analyzing → *INTERVENE* (action, residents, hospital distance, $180K repair vs $1.62M saved) → repair steps → *FAILURE PREVENTED*. |
| **Bottom — Playback bar** | Play / reset / skip plus the 4-stage AI pipeline (Detect → Predict → Prioritize → Plan). A small forecast card (NOW → 72 h, 36–52 h window) appears only while a failure is predicted. |

---

## Controls

| Action | How |
| --- | --- |
| Orbit / pan / zoom | Left-drag / right-drag / scroll (limits keep you oriented) |
| Inspect | Hover buildings, pipes, sensors and sectors; **click** to pin a live asset card |
| Camera presets | City · Sector · Underground · Failure · Impact (keys **1–5**), **Reset view** (**0**) |
| X-ray | See through the city to the luminous networks (**X**) |
| Exploded view | Separate surface / electricity / telecom / water / cooling / sewage like an engineering diagram (**E**) |
| Layers | Emphasize one network (others dim) or hide networks (**L** toggles the panel) |
| NOW / +48H | After a failure is predicted, simulate the city 48 h later if nothing is done: the main bursts (T+44 h), Riverside Avenue closes and ~20,200 residents are affected (**F**) |
| Compare outcomes | After the repair: *No intervention* vs *AI-guided intervention* |
| Scenario | Run / pause (**Space**), reset (**R**), skip to incident, click the progress bar to seek |
| Esc | Close cards, comparison and popovers |

---

## Demo scenario — "Sector B-12 Water Network Anomaly" (~50 s)

| t | Beat |
| --- | --- |
| 0 s | Healthy city overview, all systems operational |
| 2.5 s | Pressure, moisture and temperature begin to drift — amber, *individually within tolerance* |
| 7 s | *Correlating sensor signals…* — data links arc between the B-12 sensors |
| 10 s | *Pattern anomaly detected* — camera flies to Sector B-12, sector outline glows |
| 12.5 s | Source localized on Riverside Avenue (reticle) |
| 15 s | The road surface peels away tile by tile, revealing an excavation; the city turns X-ray |
| 18 s | Camera dives into the cut and follows water main WTR-B12-04 |
| 22.5 s | Fracture, spray and wet soil — **POSSIBLE WATER LEAK · 93 % · 36–52 h** |
| 26 s | Failure forecast drawn on the timeline |
| 29.5 s | Impact zone expands: affected buildings, hospital, school, road closure risk, 12,400 residents |
| 34 s | **INTERVENE — dispatch maintenance crew within 6 h** |
| 37.5 s | Valves V-B12-02 / V-B12-03 close, the isolated section turns red |
| 39.5 s | Water rerouted around B-12 through the A\|B loop (cyan) |
| 41.5 s | Crew 07 dispatched from the Utility Operations Depot along a dotted route |
| 44.5 s | Section replaced (red → amber), leak stops |
| 46.5 s | Pressure test, valves reopen (→ cyan), pressure recovers |
| 48.5 s | **FAILURE PREVENTED** — risk 87 → 21, the ground closes, camera pulls back to a healthy city |

Everything is a pure function of the scenario clock, so pause / seek / skip are exact and repeatable.

---

## Architecture

```
src/
  app/            App shell, layout, asset descriptions for cards
  components/
    dashboard/    Header, SignalRail, RecommendationPanel, IntelStrip
    overlay/      Layers, view toggles, camera presets, caption, transport, compare, +48H, tooltip, boot
    ui/           Sparkline, status chips, asset card body
  data/           City layout & procedural buildings, utility network graphs, sensors, incident constants, camera poses
  simulation/
    timeline.ts   Scenario beats, phases, captions, easing helpers
    telemetry.ts  Deterministic telemetry model (no Math.random)
    engine.ts     UI snapshot, scenario events, visual targets
    runtime.ts    Per-frame mutable state shared with the 3D scene
  store/          Zustand store (scenario status, view modes, selection, actions)
  three/
    CityScene.tsx            Scene composition, async shader warm-up
    SimulationDriver.tsx     Clock → events → damped visual state → shared uniforms
    CameraRig.tsx            Cinematic tweens, scripted dive spline, view offset between panels
    Ground / CityBuildings / SpecialProps / StreetFurniture / Traffic
    Cutaway.tsx              Lifting road tiles + strata trench walls
    UndergroundNetwork.tsx   Per-layer groups (exploded view), shafts, plates, labels
    networks/                Network graph → instanced pipes/elbows/hubs/flanges; flow shader; selected-pipe glass + particles
    SensorNodes / Valves / LeakSimulation / Correlation / ImpactZone / RepairRoute / SectorOverlay / InspectorCard
    materials/ shaders/      Patched MeshStandardMaterials (windows, ghost/X-ray, markings, strata, flow) and GLSL helpers
    Effects.tsx              Bloom, vignette, ACES tone mapping
```

Key ideas:

* **One clock, pure functions.** `computeSnapshot(t)` feeds the UI (12 Hz), `computeTargets(t, view)` feeds the scene; discrete
  beats (camera shots, X-ray, cut-away) are edge-triggered events, re-derived on seek.
* **No React re-renders per frame.** 3D components read damped values from `runtime.live` inside `useFrame` and write shared
  uniforms once per frame.
* **Real geometry, few draw calls.** Buildings, pipes, fittings, sensors, trees, lamps and cars are `InstancedMesh`es;
  windows, markings, strata, flow pulses and X-ray ghosting are shader-driven. ~1.9 ms CPU/frame at 60 FPS on a laptop GPU.
* **Fast, hitch-free start.** All shader variants (including hidden ones) are compiled in parallel with
  `KHR_parallel_shader_compile` behind a render gate, using the same offscreen variants the post-processing path needs.

---

## Technologies

Vite · React 19 · TypeScript · Three.js r186 · @react-three/fiber · @react-three/drei (CameraControls, Html, Line, Environment) ·
@react-three/postprocessing · Zustand · Lucide icons · Inter & JetBrains Mono (bundled via Fontsource, works offline).

No paid APIs, no API keys, no external services, no external models or textures — the whole city is procedural.

---

## Simulated data

All of it:

* **Telemetry** — baselines with smooth deterministic noise (sum of sines over wall time) plus scripted incident deviations.
* **Assets** — network graphs, IDs (e.g. `WTR-B12-04`, `V-B12-02`, `P-17`), materials, diameters, install years, health scores.
* **Population** — procedural building occupancy, calibrated so residents inside the impact radius total 12,400.
* **Costs & forecasts** — $180K preventive (range $120K–$250K), $1.8M failure consequence, 36–52 h failure window, 93 % confidence.

These figures are illustrative, labelled *Demo simulation* in the UI, and not measurements.

---

## Deployment

It is a static site.

**Vercel** — import the repository; framework preset *Vite*; build command `npm run build`; output directory `dist`.

**Cloudflare Pages** — build command `npm run build`; build output directory `dist`; Node 18+.

**Any static host** — run `npm run build` and upload the `dist/` folder.

For the best demo on a projector: Chrome or Edge, hardware acceleration on, browser at 1920×1080 (works down to 1440×900;
narrower screens collapse the side panels into drawers).