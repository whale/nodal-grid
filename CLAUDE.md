# Nodal Grid — Project Specification

## Purpose
Browser-based p5.js tool for generating animated node-and-edge compositions on geometric grids. Target audience is a non-technical client who needs to tweak visual parameters and export results. Must be deployable to GitHub Pages as-is (no build step).

## Tech Stack Constraints
- **Vanilla JS only** — no npm, no frameworks, no build tools, no ES modules
- **p5.js** loaded from CDN (`https://cdn.jsdelivr.net/npm/p5@1.11.11/lib/p5.min.js`)
- **gif.js** loaded from CDN for GIF export, worker vendored locally in `lib/`
- **WebM** export via native MediaRecorder API (no library)
- All code in `<script>` tags — must work by opening `index.html` in a browser

## Namespace Pattern
Every JS file adds to `window.Nodal`:
```js
window.Nodal = window.Nodal || {};
Nodal.Grid = { ... };   // in grid.js
Nodal.Nodes = { ... };  // in nodes.js
```

## File Responsibilities & Load Order
Scripts load in this order (dependencies flow downward):
1. `js/grid.js` — Grid generation (iso/tri/square), cell-based visibility, graph data structure, rendering
2. `js/nodes.js` — Node placement (axis+chaos), rendering (circle/square styles), visibility toggle
3. `js/connections.js` — Multi-node circuit routing via BFS pathfinding, polyline rendering
4. `js/animation.js` — 3 modes (stream, linedraw, glow), 8 presets, node glow, timing
5. `js/export.js` — PNG/GIF/WebM export logic
6. `js/ui.js` — Sidebar construction, control bindings, axis dial, presets, event cascade
7. `js/app.js` — p5 setup/draw, global state, initialization

## Draw Order (back to front)
Background → Grid lines → Connection paths (dimmed at 25% opacity in stream mode, hidden in linedraw mode) → Animation effects → Nodes (if visible)

## Regeneration Cascade
- Grid change → regen grid + nodes + connections + reset animation
- Node change → regen nodes + connections + reset animation
- Connection change → regen connections + reset animation
- Color/animation change → no regeneration needed

## Key Design Constraints
- Connection paths follow exact grid edges — no smoothing or curves (curves in motion easing only)
- Stream animation uses gradient line segments, not moving dots/circles
- Cell visibility uses Perlin noise + flood-fill to keep only the largest connected component
- Each connection visits 3–6 random nodes via BFS shortest-path, concatenated into one polyline
- 8 animation presets rebuild the full sidebar via `Nodal.UI.init()` when applied

## UI Layout
- Right sidebar panel, 320px wide, dark theme (#252525)
- Sections: Grid, Nodes, Connections, Animation (with preset grid), Export
- Advanced settings in collapsible `<details>/<summary>` drawer
- Native HTML controls only (color, range, select, button)
- Axis dial: mini canvas with draggable angle indicator

## Export Requirements
- PNG with background (standard save)
- PNG transparent (use `clear()` instead of `background()`)
- GIF looping (gif.js, capture frames by stepping animation via `setProgress()`)
- WebM looping (MediaRecorder on `canvas.captureStream()`)

## What NOT To Do
- Do not add npm, package.json, or any build tooling
- Do not use ES modules (import/export) — use `<script>` tags
- Do not add UI frameworks (React, Vue, etc.)
- Do not use jQuery
- Do not add a backend/server
- Do not smooth connection paths off the grid edges
- Do not add moving dots/circles to the stream animation
- Keep it simple enough to fork and modify
