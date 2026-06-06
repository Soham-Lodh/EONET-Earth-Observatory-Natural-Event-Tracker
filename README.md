# 🛰️ EONET Monitor — NASA Earth Observatory Natural Event Tracker

> A real-time, production-grade web application that visualises NASA's global natural event feed with an interactive satellite map, live status tracking, and category-based filtering — built with React 19, TypeScript, and Leaflet.

**Live Demo → [https://eonet-earth-observatory-natural-event.vercel.app](https://eonet-earth-observatory-natural-event.vercel.app)**

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture & Data Flow](#architecture--data-flow)
- [Component Reference](#component-reference)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)

---

## Overview

EONET Monitor pulls live data from NASA's **Earth Observatory Natural Event Tracker (EONET) GeoJSON API** and displays it in a polished, HUD-style dark interface. Each natural event — from wildfires and volcanoes to severe storms and sea ice — is rendered as a detailed card with metadata, magnitude readings, and track-point history. Clicking any event opens a full-screen interactive satellite map that plots the event's geographic trajectory with colour-coded markers.

The application handles up to 500 events per fetch, de-duplicates and groups GeoJSON features by event ID, and automatically derives an event's operational status (Active / Stale / Closed) using a configurable staleness threshold.

---

## Features

**Live Data Feed**
Fetches up to 500 events in a single call from the EONET GeoJSON endpoint. A pulsing green "Live Feed" indicator in the header confirms data is current.

**Smart Status Classification**
Events are automatically classified into three states without relying solely on NASA's `closed` flag:
- **Active** — last updated within 7 days
- **Stale** — no update for 7+ days but not officially closed
- **Closed** — confirmed ended by NASA

**Category Filtering**
Dynamic filter buttons are generated from the actual data returned by the API, covering 13 event types including Wildfires, Severe Storms, Volcanoes, Floods, Earthquakes, Sea and Lake Ice, Landslides, Drought, Dust and Haze, Manmade events, Snow, Temperature Extremes, and Water Color.

**Interactive Satellite Map Modal**
Each event card opens a full-screen modal backed by Leaflet and the ESRI World Imagery satellite tile layer. The map:
- plots all track points as circle markers
- connects multi-point events with a dashed polyline in the event's category colour
- distinguishes the **origin point** (green), intermediate track points (category colour), and the **last known position** (red for active, grey for closed)
- auto-fits the viewport to all plotted coordinates
- displays rich popups with point index, timestamp, coordinates, and magnitude

**Animated Skeleton Loading**
Nine shimmer skeleton cards are shown during the initial data fetch, preventing layout shift and communicating progress to the user.

**Error Recovery**
If the API request fails, a styled error state with a "Retry Connection" button is shown in place of the grid.

**Responsive Design**
The grid collapses to a single column on mobile. The HUD stats bar and modal stat panels hide gracefully on narrow viewports.

**Polished UI**
- Deep space dark background (`#080c10`) with a subtle grid overlay and orange radial glow
- Sticky frosted-glass header with live event counters
- Staggered card entrance animations with `cubic-bezier` easing
- Category-specific accent colours carried consistently from card badge through to the map polyline
- Custom dark Leaflet popup theme to match the overall design language
- Google Fonts: **Syne** (headings) and **Space Mono** (data labels)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 6 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 + CSS-in-JS (scoped `<style>` blocks) |
| Routing | React Router DOM v7 |
| Map | Leaflet 1.9 + React Leaflet 5 |
| UI Primitives | Radix UI (Dialog) |
| Tile Provider | ESRI World Imagery (ArcGIS REST) |
| Data Source | NASA EONET GeoJSON API |
| Linting | ESLint 10 + TypeScript ESLint + React Hooks plugin |
| Deployment | Vercel |

---

## Project Structure

```
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── package.json
└── src/
    ├── main.tsx              # App entry point — mounts BrowserRouter + StrictMode
    ├── App.tsx               # Route declarations
    ├── index.css             # Tailwind + Leaflet CSS imports
    ├── leafletFix.ts         # Patches Leaflet default icon paths for Vite bundling
    ├── pages/
    │   └── Home.tsx          # Core page — data fetching, filtering, layout, HUD header
    ├── components/
    │   ├── DisasterCard.tsx  # Individual event card with stats, status badge, track bar
    │   └── EventMapModal.tsx # Full-screen Leaflet map modal with trajectory visualisation
    └── types/
        ├── eonet.ts          # DisasterEvent and EventPoint interfaces
        └── news.ts           # NewsArticle interface (reserved for future news integration)
```

---

## Getting Started

**Prerequisites:** Node.js 18+ and npm 9+

```bash
# 1. Clone the repository
git clone https://github.com/soham-lodh/eonet-earth-observatory-natural-event-tracker.git
cd eonet-earth-observatory-natural-event-tracker

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Then add your EONET API base URL (see Environment Variables below)

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

Other available scripts:

```bash
npm run build    # Type-check and produce an optimised production build
npm run preview  # Preview the production build locally
npm run lint     # Run ESLint across all TypeScript and TSX files
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_API=https://eonet.gsfc.nasa.gov/api/v3
```

The `VITE_API` variable exposes the EONET API base URL to the client bundle via Vite's `import.meta.env`. The application appends `/events/geojson?limit=500` to this base when fetching events.

> **Note:** The NASA EONET API is public and does not require an API key.

---

## Architecture & Data Flow

```
NASA EONET GeoJSON API (/events/geojson?limit=500)
        │
        ▼
  Home.tsx — getData()
        │  Fetches raw GeoJSON FeatureCollection
        │
        ▼
  groupEvents()
        │  Groups features by event ID
        │  Aggregates track points (date, coordinates, magnitude)
        │  Derives startDate / endDate / peak magnitudeValue
        │  Attaches computed status: "active" | "stale" | "closed"
        │
        ▼
  events[] (DisasterEvent[]) stored in React state
        │
        ├─── HUD header reads activeCount / staleCount / closedCount
        │
        ├─── Category filter derives unique categories from data
        │
        └─── filtered[] → DisasterCard grid
                              │
                              └── onViewMap → selectedEvent → EventMapModal
                                                  │
                                                  └── Leaflet map initialised
                                                      via dynamic import()
                                                      Tile: ESRI World Imagery
                                                      Markers + polyline rendered
                                                      per event.points[]
```

**Staleness logic** (`deriveStatus`): compares `endDate` (the timestamp of the last recorded track point) against `Date.now()`. If the gap exceeds `STALE_DAYS` (7) and the event has no `closed` timestamp, the event is classified as `stale`.

**Leaflet in Vite:** The standard Leaflet icon URL resolution breaks in Vite's module bundler. `leafletFix.ts` deletes the internal `_getIconUrl` prototype property and re-merges icon paths explicitly from imported image assets, restoring correct marker rendering.

**Dynamic import for Leaflet:** The map is initialised inside a `useEffect` with `import("leaflet")` to avoid SSR issues and defer the heavier Leaflet bundle until the modal is actually opened.

---

## Component Reference

### `Home.tsx`

The root page component. Responsibilities:
- Fetches and normalises EONET GeoJSON data on mount
- Manages `events`, `filter`, `selectedEvent`, `loading`, and `error` state
- Renders the sticky HUD header with live counters
- Renders the dynamic category filter bar
- Renders the event grid (skeleton cards during load, error state on failure, or `DisasterCard` components)
- Passes `onViewMap` callback to cards to open the modal

### `DisasterCard.tsx`

Displays a single natural event. Highlights:
- Category badge with emoji icon and per-category accent colour
- Status badge (Active / Stale / Closed) with a pulsing dot for active events
- Event title, start date, end date, and peak magnitude
- Track point count visualised as a proportional progress bar
- Staggered entrance animation driven by the card's `index` prop
- "View on Map" button that triggers the parent's `onViewMap` callback

### `EventMapModal.tsx`

Full-screen modal containing the Leaflet map. Highlights:
- Lazily imports Leaflet to keep the initial bundle lean
- Initialises the map once on mount via a `ref` guard to prevent double-initialisation in React StrictMode
- Renders an ESRI satellite tile layer
- Plots origin (green), intermediate (category colour), and last-known (red/grey) markers as `circleMarker` instances
- Connects track points with a dashed `polyline`
- Auto-fits bounds with 60px padding; falls back to a zoom-8 centred view for single-point events
- Custom `dark-popup` CSS class applied to all Leaflet popups for design consistency
- Closes on Escape key or overlay click; cleans up the Leaflet instance on unmount

### `leafletFix.ts`

Patches the Leaflet default icon to work correctly with Vite's asset pipeline by deleting `_getIconUrl` and explicitly merging the correct icon URLs from imported static assets.


---


## Data Source

This project consumes the **NASA EONET (Earth Observatory Natural Event Tracker) API v3**, a public API maintained by NASA's Earth Observatory team. Data is provided under NASA's open data policy with no authentication required.

API endpoint used: `https://eonet.gsfc.nasa.gov/api/v3/events/geojson?limit=500`

Documentation: [https://eonet.gsfc.nasa.gov/docs/v3](https://eonet.gsfc.nasa.gov/docs/v3)

---

*Built by Soham Lodh*