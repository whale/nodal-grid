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
// etc.
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

## Default Values
| Property | Default |
|----------|---------|
| Grid type | `isometric` |
| Cell size | `60` |
| Grid color | `#ffffff` |
| Grid opacity | `40%` (0.4) |
| Shape chaos | `0` (0-100) |
| Shape direction | `90` degrees |
| Shape elongation | `50` (0-100) |
| Shape spread | `50` (0-100) |
| Background | `#333333` |
| Node count | `8` |
| Node visible | `true` |
| Node style | `circle` (outline + center dot) |
| Node color | `#c8ff00` (lime) |
| Node size | `12` |
| Axis angle | `45` degrees |
| Chaos | `30` (0-100) |
| Connection count | `8` |
| Edge color | `#c8ff00` |
| Edge thickness | `2` |
| Edge style | `solid` |
| Animation mode | `particle` (renders as "Stream" in UI) |
| Animation behavior | `mirror` (alternative: `loop`) |
| Animation speed | `50` (0-100) |
| Stream length | `0.12` (fraction of path) |
| Trail length | `15` (segment count) |
| Node pulse | `true` |
| Glow intensity | `60` (0-100) |
| Canvas size | `1920x1080` (export), fills viewport (display) |

## Key Algorithms

### Grid Cell Visibility
Cell-based approach with Perlin noise. Each triangular/square cell gets a visibility score:
```
centerBias = 1 - normalizedDistance
centerBoost = max(0, 1 - normDist * 2.5)^2
score = centerBias * (1 - chaos * 0.5) + noise * (0.2 + chaos * 0.5) + centerBoost * 0.3
visible = score > (0.5 + chaos * 0.32)
```
- Spread factor: `0.3 + (shapeSpread / 100) * 1.7` applied to distance normalization
- Elongation: rotates coordinates into direction space, stretches along axis
- After scoring, flood-fill keeps only the largest connected component

### Isometric Grid
Triangular lattice: vertices at axial coords (q, r), pixel positions:
- `x = centerX + cellSize * (q + r * 0.5)`
- `y = centerY + cellSize * (r * sqrt(3)/2)`
- 6 neighbors per vertex via shared edges of triangular cells

### Multi-Node Circuit Routing
Each connection visits 3–6 random nodes (Fisher-Yates shuffle for selection). BFS shortest-path between consecutive waypoints, concatenated into one polyline. Paths follow exact grid edges — no smoothing or curves.

### Axis + Chaos Placement
For each grid vertex: `score = axisAlignment * (1 - chaos) + random * chaos`. Sort descending, pick top N with minimum-distance filtering to prevent clustering.

### Stream Animation (Tron effect)
- Gradient line segments from tail (dim) to head (bright)
- Alpha: cubic ramp (`progress^3`)
- Width: `baseWeight * (0.3 + progress * 2.0)`
- Canvas `shadowBlur` on leading 35% for glow
- Sine easing for deceleration at endpoints: `0.5 - 0.5 * cos(t * PI)`
- Node glow: proximity detection (40px radius), fast rise (rate 14) / slow decay (rate 2.5)

### Animation Presets
8 presets that set multiple parameters at once: Circuit, Data Flow, Pulse, Synaptic, Swarm, Cascade, Trace, Minimal. Applied via preset buttons that call `Nodal.UI.init()` to rebuild the sidebar reflecting new values.

## UI Layout
- Right sidebar panel, 320px wide, dark theme (#252525)
- Sections: Grid, Nodes, Connections, Animation (with preset grid), Export
- Advanced settings in collapsible `<details>/<summary>` drawer
- Native HTML controls: `input[type=color]`, `input[type=range]`, `select`, `button`
- Toggle groups for binary choices (On/Off, Mirror/Loop, Circle/Square, Solid/Dashed)
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
- Do not smooth connection paths off the grid edges (curves should be in motion easing only)
- Do not add moving dots/circles to the stream animation (streams are gradient lines only)
- Keep it simple enough to fork and modify
