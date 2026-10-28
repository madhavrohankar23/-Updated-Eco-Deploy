# AGENTS.md — Eco-Move Nagpur System Knowledge Base & AI Agent Architecture Guide

> **Purpose:** This file acts as an immediate, persistent, in-memory knowledge base for AI coding agents (Antigravity / Gemini IDE). It details the entire architecture, directory map, state machine, map engine, datasets, routing formulas, and coding guardrails of the **Eco-Move Nagpur** project so that agents never need to perform repeated discovery sweeps or re-read files from scratch.

---

## 1. Project Overview & Mission

- **Project Name:** Eco-Move Nagpur FYP
- **Domain:** Intelligent Multimodal Public Transit, Real-Time Fleet Tracking, Dynamic Eco-Routing & Digital Ticketing
- **Geographic Scope:** Greater Nagpur Metropolitan Region (Maharashtra, India)
  - **Bounding Coordinates:** `[20.80, 78.75]` (SW: Butibori, Hingna MIDC, MIHAN) to `[21.42, 79.40]` (NE: Koradi, Kamptee, Kanhan, Mauda, Pardi).
- **Core Modes Supported:**
  - 🚌 **Aapli Bus (Nagpur Municipal Corporation):** 837 routes, 1,796 transit stops.
  - 🚇 **Maha Metro Nagpur:** Orange Line (North-South: Automative Square $\leftrightarrow$ Khapri) & Blue Line (East-West: Prajapati Nagar $\leftrightarrow$ Lokmanya Nagar).
  - 🚶 **Walking:** Multi-hop pedestrian links, transfer corridors, first-mile / last-mile legs.
  - 🚗 **On-Demand & Taxis:** Uber integration (Auto, Go, Moto/Bike) + fallback direct driving route.
- **Key Value Proposition:**
  - True multimodal route generation using customized A* graph traversal.
  - Preference-based optimization: *Fastest*, *Lowest CO₂ Emissions*, *Least Walking*, *Fewest Transfers*.
  - Live bus fleet visualization (Chalo API / simulated telemetry).
  - Concentric progressive radial nearby transit locator.
  - Gamified Green Rewards & QR-code digital ticketing pass generation.

---

## 2. Technology Stack & Runtime Configuration

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Framework** | TanStack Start (Fullstack React router & SSR framework) |
| **View Engine** | React 19 (`react`, `react-dom`) |
| **Bundler & Tooling**| Vite (`vite.config.ts`), TypeScript (`tsconfig.json`) |
| **CSS & Styling** | Vanilla CSS + Tailwind CSS v4 (`@tailwindcss/vite`, `src/styles.css`) |
| **Mapping & GIS** | Leaflet 1.9.4 (`leaflet`), React-Leaflet 5.0.0 (`react-leaflet`, `@types/leaflet`) |
| **Database & Auth** | Supabase JS Client (`@supabase/supabase-js`, `src/supabaseClient.ts`) |
| **Icons & UI** | Lucide React (`lucide-react`), Radix UI Primitives (`@radix-ui/*`), Sonner toasts |
| **AI Integration** | n8n MCP Server AI integration (`.agents/mcp_config.json`, `src/lib/n8nAiService.ts`) |
| **Dev Execution** | `npm run dev` (Node max-old-space-size=4096 on `http://localhost:3000`) |

---

## 3. Exhaustive Project Directory Map

```
Eco-Move_Nagpur FYP/
├── .agents/
│   └── mcp_config.json             # n8n HTTP MCP server config for conversational AI
├── public/                         # Public static assets, map marker icons, illustrations
├── src/
│   ├── components/                 # Reusable UI & Map Components (see section 4)
│   ├── context/
│   │   └── AuthContext.tsx         # Supabase Authentication context (login, user state, session)
│   ├── data/                       # Heavy transit datasets & schedules (see section 7)
│   │   ├── bus_fares.json          # Stage-by-stage bus fare matrix (~13 MB)
│   │   ├── bus_schedules.json      # Timetables and stop arrival times (~1 MB)
│   │   ├── chalo_routes_index.json # Chalo live bus route index (~1.2 MB)
│   │   ├── lineGeometries.json     # Detailed coordinate polylines for routes (~18.7 MB)
│   │   ├── metro_fares.json        # Metro station-to-station fare lookup (~358 KB)
│   │   └── network.json            # Full graph: bus stops, metro stations, route lines (~8.8 MB)
│   ├── hooks/
│   │   └── use-mobile.tsx          # Responsive viewport / breakpoint hook
│   ├── lib/                        # Core algorithmic services & API clients (see section 5)
│   │   ├── busTimetableService.ts  # Schedule lookup & timetable generator
│   │   ├── fares.ts                # Bus & Metro fare calculations
│   │   ├── frequencies.ts          # Peak/off-peak headway & frequency data
│   │   ├── liveBus.ts              # Real-time telemetry, mock simulator, Chalo markers
│   │   ├── n8nAiService.ts         # Agentic AI assistant, transit query prompt pipelines
│   │   ├── nagpurPlaces.ts         # Curated database of Nagpur POIs, colleges, hospitals
│   │   ├── nearby.ts               # Spatial distance computation & stop filtering
│   │   ├── network.ts              # Network graph loader & parser
│   │   ├── ors.ts                  # OpenRouteService API client for driving/walking
│   │   ├── placesSearch.ts         # Landmark search & autocomplete
│   │   ├── routing.ts              # A* Multimodal Journey Planner engine (~57 KB)
│   │   ├── ticketing.ts            # Digital ticket creation & Supabase storage
│   │   ├── ticketExporter.ts       # PDF / image pass export
│   │   ├── uberApi.ts              # Uber ride estimates & nearby mock vehicles
│   │   └── wavRecorder.ts          # Voice input recording for AI Transit Chatbot
│   ├── routes/
│   │   ├── __root.tsx              # Root TanStack layout with AuthProvider & Toaster
│   │   ├── app.tsx                 # MASTER APPLICATION CONTROLLER (~3,700 lines)
│   │   ├── index.tsx               # Public landing page (Hero, features, CTA)
│   │   ├── login.tsx               # Supabase sign-in screen
│   │   ├── signup.tsx              # User registration screen
│   │   ├── forgot-password.tsx     # Password recovery workflow
│   │   └── update-password.tsx     # Password reset confirmation
│   ├── routeTree.gen.ts            # Auto-generated TanStack router tree
│   ├── router.tsx                  # Router instance configuration
│   ├── styles.css                  # Core CSS, Tailwind tokens, animations, map marker styles
│   └── supabaseClient.ts           # Supabase client instantiation
├── AGENTS.md                       # THIS FILE — System Knowledge Base
├── package.json                    # Dependencies & execution scripts
├── tsconfig.json                   # TypeScript path aliases (@/* -> src/*)
├── vite.config.ts                  # Vite config (plugins, TanStack Start, tailwindcss)
└── work_log_report.md              # Chronological development activity log (33 days, 500+ prompts)
```

---

## 4. Key Component Responsibilities (`src/components/`)

### `MapView.tsx` (CRITICAL MAP COMPONENT — ~2,000 Lines)
- **Role:** Renders Leaflet map canvas, all polylines, stops, vehicles, and user interaction layers.
- **Bounding Box:** Enforced via `NAGPUR_MAP_BOUNDS = [[20.80, 78.75], [21.42, 79.40]]`.
- **Camera Controller (`FlyToLocation`):**
  - Adjusts altitude based on active radius tier:
    - **1 km Radius:** `targetZoom = 15.75`
    - **2.5 km Radius:** `targetZoom = 14.5`
    - **5 km Radius:** `targetZoom = 13.5`
  - Unconditionally calls `map.flyTo([pos.lat, pos.lon], targetZoom, { duration: 0.5, easeLinearity: 0.25 })` to guarantee proper viewport framing across all clicks and radius changes.
- **Animated Coverage Circle (`AnimatedNearbyCircle`):**
  - Manages Leaflet layers (`L.circle`, glow `L.circleMarker`, center pin `L.circleMarker`) directly via refs.
  - Interpolates `[lat, lon]` and `radius` over **500ms** using cubic ease-out (`1 - Math.pow(1 - progress, 3)`).
  - Runs at 60/120 FPS on `requestAnimationFrame` with **0 React re-renders**.
- **Nagpur Boundary Guard (`NagpurBoundsWatcher`):**
  - Detects when the user pans, drags, or clicks outside the Greater Nagpur Metropolitan Area (`NAGPUR_MAP_BOUNDS`).
  - Allows gentle elastic resistance (`NAGPUR_OUTER_BOUNDS` with `maxBoundsViscosity=0.35`) and on release smoothly flies the user back to Nagpur center (`[21.1458, 79.0882]`, zoom 13, duration: 0.9s).
  - Out-of-bounds clicks automatically fly back to center and avoid creating invalid transit points.
- **Concentric Stop Wave Loader (`ProgressiveNearbyStopsLayer`):**
  - Progressively renders transit stops outward in concentric waves (~28 stops per ~24ms batch) to eliminate main-thread freezing when expanding search radius.
  - Keyed by `key={`progressive-nearby-${lat}_${lon}_${radiusM}`}` to smoothly restart on every new anchor.
- **Marker Design Elements:**
  - **Origin / Destination:** Slender 3D pushpin tacks (Green for origin, Red for destination) with ground shadows and specular shine.
  - **Nearby Transit Stops (`NearbyStopMarker`):** 3D circular pins (`🚌` / `🚇`) with clean station names, distance pills, and floating glassmorphism hover cards.
  - **Live Buses:** Chalo-style vehicle pins with route badges, direction arrows, and live/halted status rings.
  - **Uber Vehicles:** 2D top-down rotating icons for auto, bike, and cab.

### Other Essential Components:
- **`AiRouteExplainer.tsx` & `SideRouteAiExplainer.tsx`:** Natural language breakdown of route segments, transfers, walking instructions, and carbon impact.
- **`AiTransitChatbot.tsx`:** Floating conversational assistant with voice input (`wavRecorder.ts`) and n8n MCP agent connection.
- **`BusTimetablePanel.tsx`:** Nagpur Aapli Bus route scheduler, search by route number or terminal.
- **`CabOptions.tsx`:** Real-time fare and ETA comparison across Uber Auto, Uber Go, and Uber Moto.
- **`DigitalTicketPass.tsx`:** Generates high-fidelity digital transit passes with active QR codes, expiry timers, and route details.
- **`GreenRewardsPanel.tsx`:** Gamified carbon credit tracker (kg CO₂ saved, reward tiers, free metro ride vouchers).
- **`GoogleMapsLayersFAB.tsx`:** Map tile style switcher (Carto Positron, OpenStreetMap, Satellite, Transit).
- **`GoogleMapsSearchBar.tsx`:** Landmark, station, and bus stop search bar with instant autocomplete.
- **`LiveBusTracker.tsx`:** Dedicated bus route tracking drawer showing real-time vehicle movement.

---

## 5. Algorithmic Architecture & Data Flow

### 1. A* Multimodal Routing Engine (`src/lib/routing.ts`)
The routing engine executes an A* pathfinding algorithm over a multi-layer graph of Nagpur transit:
1. **Graph Nodes:** All bus stops (1,796), metro stations (36+), origin point, destination point.
2. **Graph Edges:**
   - Walking transfers between adjacent stops (max walk distance: 800m).
   - Bus route segments (derived from `network.json` and `lineGeometries.json`).
   - Metro line links (Orange Line & Blue Line with inter-station running times).
   - Fallback direct driving route if no transit connection exists within pedestrian limits.
3. **Speed Constants:**
   - Walk: `4.5 km/h`
   - Bus: `18.0 km/h` (includes typical Nagpur road traffic & dwell times)
   - Metro: `35.0 km/h` (high frequency, dedicated right-of-way)
   - Driving: `30.0 km/h`
4. **CO₂ Emission Factors:**
   - Walk: `0.00 kg CO₂ / km`
   - Metro: `0.015 kg CO₂ / passenger-km`
   - Bus: `0.045 kg CO₂ / passenger-km`
   - Car / Cab: `0.180 kg CO₂ / vehicle-km`
5. **Preference Cost Function $f(n) = g(n) + h(n)$:**
   - **Fastest:** Minimizes total trip duration $T_{\text{total}} = T_{\text{walk}} + T_{\text{transit}} + T_{\text{wait}}$.
   - **Lowest CO₂:** Heavily penalizes road vehicle legs; prioritizes Metro & walking links.
   - **Least Walking:** Adds a $4\times$ penalty multiplier on walking duration.
   - **Fewest Transfers:** Adds a 15-minute penalty per route transfer.

### 2. Live Bus Tracking & Spatial Sampling (`src/lib/liveBus.ts`)
- Implements spatial probe sampling (cardinal & diagonal probes) to query 100% of active vehicles across 1 km to 5 km radii.
- Calculates dynamic bearing ($\theta$) between consecutive coordinate updates to rotate bus directional arrows.
- Detects halted vehicles if coordinates remain unchanged for $> 45\text{s}$.

---

## 6. Master App Controller State Machine (`src/routes/app.tsx`)

`src/routes/app.tsx` acts as the single source of truth for application UI state:

| State Variable | Type | Description |
| :--- | :--- | :--- |
| `activeRailItem` | `string` | `"directions" \| "nearby" \| "live" \| "uber" \| "places" \| "saved"` |
| `cardOpen` | `boolean` | Controls visibility of the left slide-over panel |
| `origin`, `destination` | `Place \| null` | Currently selected start and end coordinates |
| `journey` | `Journey \| null` | Active calculated route output from `planJourney()` |
| `pref` | `RoutingPref` | Active preference: `"fastest" \| "eco" \| "least_walk" \| "fewest_transfers"` |
| `nearbyAnchor` | `{ lat, lon, name } \| null` | Pinned center coordinate for Nearby Locator |
| `nearbyRadiusM` | `number` | Selected search radius: `1000` (1 km), `2500` (2.5 km), or `5000` (5 km) |
| `nearbyTab` | `"stops" \| "buses"` | Toggles transit stop markers vs. live bus markers in Nearby mode |
| `nearbyMarkers` | `NearbyStop[]` | Computed list of stops within `nearbyRadiusM` of `nearbyAnchor` |
| `nearbyLiveBuses` | `NearbyLiveBusItem[]` | Live bus vehicles actively inside `nearbyRadiusM` |
| `picking` | `string \| null` | Map click listener mode: `"origin" \| "destination" \| "cab_origin" \| "cab_destination"` |

---

## 7. Critical Engineering Rules & Guardrails for AI Agents

When modifying this repository, **ALWAYS** follow these strict rules:

### Rule 1: High-Frame-Rate Map Performance (60 FPS Guarantee)
- **Never** render all 837 bus routes or 1,796 bus stops synchronously in a single React render cycle. Doing so blocks the browser main thread and causes 2–3s freezes.
- Always use progressive batching (`requestAnimationFrame`), chunked wave loaders, or memoized markers (`NearbyStopMarker`).
- For coordinate animations, manipulate Leaflet DOM layers directly via refs (`setLatLng`, `setRadius`) rather than pushing state updates into React every 16ms.

### Rule 2: Strict Map Framing & Zoom Hierarchy
- Whenever `nearbyRadiusM` or `nearbyAnchor` changes:
  - `1000m` **MUST** fly to `zoom 15.75`.
  - `2500m` **MUST** fly to `zoom 14.5`.
  - `5000m` **MUST** fly to `zoom 13.5`.
- Do not bypass `map.flyTo` with `map.panTo` if the target zoom does not match the active radius.

### Rule 3: Algorithmic Integrity
- Do not modify core A* graph traversal in `src/lib/routing.ts` or change node definitions without running scenario tests (`test_routing_improvements.ts`, `test_metro_fare_scenarios.ts`).
- Preserve fallback driving routes when origin or destination is out of walking reach of public transit.

### Rule 4: Zero TypeScript Compilation Errors
- Always run `npx tsc --noEmit` before concluding any edit session to ensure 0 type errors.

### Rule 5: Maintain Work Activity Log
- After completing major user-directed tasks, append the session summary to [`work_log_report.md`](file:///c:/Users/Rohit/Desktop/Eco-Move_Nagpur%20FYP/work_log_report.md) with exact timestamps, prompt descriptions, and technical impact.
