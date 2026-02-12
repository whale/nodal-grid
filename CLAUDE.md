# Nodal Grid — Project Specification

## Purpose
Browser-based p5.js tool for generating animated node-and-edge compositions on geometric grids. Target audience is a non-technical client who needs to tweak visual parameters and export results.

## Tech Stack Constraints
- **Vanilla JS only** — no npm, no frameworks, no build tools, no ES modules
- **p5.js** loaded from CDN (`https://cdn.jsdelivr.net/npm/p5@1.11.11/lib/p5.min.js`)
- **gif.js** loaded from CDN for GIF export, worker vendored locally in `lib/`
- **WebM** export via native MediaRecorder API (no library)
- All code in `<script>` tags — must work by opening `index.html` in a browser
- Must be deployable to GitHub Pages as-is (no build step)

## Namespace Pattern
Every JS file adds to `window.Nodal`:
```js
window.Nodal = window.Nodal || {};
Nodal.Grid = { ... };   // in grid.js
Nodal.Nodes = { ... };  // in nodes.js
// etc.
```

## File Responsibilities & Load Order
Scripts load in this order (dependencies flow downward):
1. `js/grid.js` — Grid generation (iso/tri/square), graph data structure, rendering
2. `js/nodes.js` — Node placement (axis+chaos), rendering (circle/square styles)
3. `js/connections.js` — BFS pathfinding over grid graph, polyline rendering
4. `js/animation.js` — 3 modes (particle, linedraw, glow), timing, play/pause
5. `js/export.js` — PNG/GIF/WebM export logic
6. `js/ui.js` — Sidebar construction, control bindings, event cascade
7. `js/app.js` — p5 setup/draw, global state, initialization

## Draw Order (back to front)
Background → Grid lines → Connection paths → Animation effects → Nodes

## Regeneration Cascade
- Grid change → regen grid + nodes + connections + reset animation
- Node change → regen nodes + connections + reset animation
- Connection change → regen connections + reset animation
- Color/animation change → no regeneration needed

## Default Values
| Property | Default |
|----------|---------|
| Grid type | `isometric` |
| Cell size | `60` |
| Grid color | `#ffffff` |
| Grid opacity | `40%` (0.4) |
| Background | `#333333` |
| Node count | `8` |
| Node style | `circle` (outline + center dot) |
| Node color | `#c8ff00` (lime) |
| Node size | `12` |
| Axis angle | `45` degrees |
| Chaos | `30` (0-100) |
| Connection count | `5` |
| Edge color | `#c8ff00` |
| Edge thickness | `2` |
| Edge style | `solid` |
| Animation mode | `particle` |
| Animation speed | `50` (0-100) |
| Canvas size | `1920x1080` (export), fills viewport (display) |

## Key Algorithms

### Isometric Grid
Triangular lattice: vertices at axial coords (q, r), pixel positions:
- `x = centerX + cellSize * (q + r * 0.5)`
- `y = centerY + cellSize * (r * sqrt(3)/2)`
- 6 neighbors per vertex: (q+1,r), (q-1,r), (q,r+1), (q,r-1), (q+1,r-1), (q-1,r+1)

### Axis + Chaos Placement
For each grid vertex, score = `projection_on_axis * (1 - chaos) + random * chaos`. Sort descending, pick top N with minimum-distance filtering.

### BFS Pathfinding
Standard BFS over `Nodal.Grid.vertices` graph. Connections follow grid edges as polylines (not straight lines).

## UI Layout
- Right sidebar panel, 320px wide, dark theme (#252525)
- Sections: Grid, Nodes, Connections, Animation, Export
- Advanced settings in collapsible `<details>/<summary>` drawer
- Native HTML controls: `input[type=color]`, `input[type=range]`, `select`, `button`

## Export Requirements
- PNG with background (standard save)
- PNG transparent (use `clear()` instead of `background()`)
- GIF looping (gif.js, capture frames by stepping animation)
- WebM looping (MediaRecorder on `canvas.captureStream()`)
- Support export at custom resolution via off-screen p5.Graphics buffer

## What NOT To Do
- Do not add npm, package.json, or any build tooling
- Do not use ES modules (import/export) — use `<script>` tags
- Do not add UI frameworks (React, Vue, etc.)
- Do not use jQuery
- Do not add a backend/server
- Keep it simple enough to fork and modify
- Do not over-engineer — this is a visual tool, not a production app
