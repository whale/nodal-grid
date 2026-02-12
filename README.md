# Nodal Grid

A browser-based interactive tool for generating animated node-and-edge compositions on geometric grids. Built with p5.js — no build tools, no dependencies to install. Open `index.html` and start creating.

![Nodal Grid](https://img.shields.io/badge/p5.js-1.11.11-ed225d) ![License](https://img.shields.io/badge/license-MIT-green)

## Quick Start

1. Open `index.html` in your browser
2. Adjust controls in the right sidebar
3. Try the animation presets to explore different feels
4. Export as PNG, GIF, or WebM

For GIF export (requires local server for gif.js worker):
```bash
python3 -m http.server 8765
# Then open http://localhost:8765
```

## Deployment

Push to a GitHub repo and enable Pages from the main branch. No build step needed — it just works.

---

## Controls Reference

### Grid
| Control | Range | What it does |
|---------|-------|-------------|
| Type | Isometric / Triangular / Square | Grid geometry. Isometric gives 3D cube wireframe look |
| Cell Size | 20–150 | Spacing between grid intersections |
| Color | Color picker | Grid line color |
| Opacity | 0–100% | Grid line visibility |
| Shape Chaos | 0–100 | 0 = full grid, 100 = broken up with holes and negative space |
| Shape Dir | 0–360° | Directional bias for where the grid is denser |
| Elongation | 0–100 | Stretch the grid shape along the direction axis |
| Spread | 0–100 | How far the grid extends from center |

### Nodes
| Control | What it does |
|---------|-------------|
| Show | Toggle node visibility on/off (hide to see only animations) |
| Count | 2–30 nodes placed on grid intersections |
| Style | Circle (ring + center dot) or Square (outline + center dot) |
| Color | Node fill and stroke color |
| Size | Node radius (4–30) |
| Axis | Directional bias for node placement (dial + slider, 0–360°) |
| Chaos | 0 = nodes cluster tightly along axis, 100 = random scatter |
| Regenerate | Re-roll node positions with current settings |

### Connections
| Control | What it does |
|---------|-------------|
| Count | Number of circuit paths (0–30). Each visits 3–6 random nodes |
| Color | Connection line color |
| Thickness | Line weight (1–8) |
| Style | Solid or Dashed |

### Animation
**Presets** (click to apply — changes multiple settings at once):

| Preset | Feel |
|--------|------|
| Circuit | Precise grid routing, mirror bounce |
| Data Flow | Fast one-way packets, many thin streams |
| Pulse | Slow breathing glow on all paths |
| Synaptic | Long slow streams, subtle node pulse |
| Swarm | Many fast tiny packets, no pulse |
| Cascade | Medium streams, staggered loop |
| Trace | Lines draw and redraw themselves |
| Minimal | Few slow streams, wide glow |

**Manual controls:**

| Control | What it does |
|---------|-------------|
| Mode | Stream / Line Draw / Glow-Pulse / None |
| Behavior | Mirror (bounce back and forth) or Loop (one direction, restart) |
| Speed | Animation speed (0–100) |
| Play/Pause | Toggle animation |
| Color | Stream/glow color |
| Node Pulse | Nodes glow when a stream passes through them |

### Export
| Button | Output |
|--------|--------|
| PNG | Current frame with background |
| PNG (clear) | Current frame, transparent background |
| GIF | Looping animated GIF (set duration first) |
| WebM | Looping video file |

### Advanced (collapsible drawer)
Background color, export dimensions, node stroke weight, dash parameters, stream length, smoothness (segment count), glow intensity, and RNG seed.

---

## Architecture

```
Nodal Graph/
  index.html          ← Single page app, loads everything
  style.css           ← Dark theme, sidebar layout
  js/
    grid.js           ← Grid generation + graph structure
    nodes.js          ← Node placement (axis + chaos)
    connections.js    ← Multi-node circuit routing (BFS)
    animation.js      ← Stream, line draw, glow modes
    export.js         ← PNG / GIF / WebM
    ui.js             ← Sidebar controls + presets
    app.js            ← p5 setup/draw, initialization
  lib/
    gif.worker.js     ← Vendored gif.js worker
```

**Namespace**: Every JS file adds to `window.Nodal` (e.g., `Nodal.Grid`, `Nodal.Nodes`). No build tools, no ES modules — just `<script>` tags loaded in dependency order.

**Draw order** (back to front): Background → Grid lines → Connection paths (dimmed in stream mode) → Animation effects → Nodes (if visible)

**Regeneration cascade**: Grid change → regen everything. Node change → regen nodes + connections + animation. Connection change → regen connections + animation. Color/animation change → no regen needed.

---

## How Things Work

### Grid Shaping
The grid uses cell-based visibility with Perlin noise. Each triangular or square cell gets a visibility score based on:
- **Center bias** — grid always stays anchored at center
- **Perlin noise** — organic holes and negative space
- **Direction + elongation** — stretch the shape along an axis
- **Spread** — control how far from center the grid extends
- **Connectivity guarantee** — flood-fill keeps only the largest connected component (no floating islands)

### Circuit Routing
Connections aren't simple A→B lines. Each connection visits 3–6 random nodes as waypoints, using BFS shortest-path between consecutive stops. This creates complex, circuit-board-like routing that follows grid edges exactly.

### Stream Animation
The "Tron stream" effect draws gradient line segments from tail (dim) to head (bright):
- Cubic alpha ramp for the glow falloff
- Width scales from thin tail to thick head
- Canvas `shadowBlur` on the leading 35% for the glow effect
- Sine easing for natural deceleration at node endpoints
- Node proximity detection triggers glow pulse when streams pass through

---

## Taking It From Here

This is a fully working tool. Here are directions you might extend it:

### Easy Wins
- **More grid types**: Hexagonal (honeycomb), Voronoi, radial/concentric
- **Color themes**: Preset color palettes (cyberpunk, ocean, forest, etc.)
- **Node styles**: More shapes — diamond, triangle, star, custom SVG
- **Connection styles**: Dotted, gradient color along path, variable thickness
- **URL state**: Encode settings in URL hash so configurations are shareable links

### Medium Complexity
- **Multiple animation layers**: Different streams with different colors/speeds on the same grid
- **Interactive mode**: Click to add/remove nodes, drag to reposition
- **Undo/redo**: Track state changes for reversal
- **SVG export**: Vector output for print/illustration use
- **Responsive presets**: Optimize layouts for common aspect ratios (16:9, 1:1, 9:16)
- **Sound reactivity**: Use Web Audio API to drive animation speed/intensity from microphone

### Bigger Projects
- **3D mode**: Use WebGL/three.js for actual 3D isometric rendering with camera controls
- **Parametric paths**: Bézier or spline-based connections (speed easing only — paths must follow grid)
- **Timeline editor**: Keyframe animation parameters over time for complex sequences
- **Node types**: Different node categories with distinct visuals and connection rules
- **Physics simulation**: Spring-based layout, particle effects, gravity wells at nodes

### Code Patterns to Know
- All state lives on `window.Nodal.*` — no hidden state, easy to inspect in console
- UI rebuilds itself via `Nodal.UI.init()` — presets call this after changing values
- `Nodal.Animation.setProgress(t)` steps the animation to time `t` (used by GIF export)
- Grid graph is a `Map` of vertices with neighbor lists — standard BFS/graph algorithms work on it
- p5.js is in global mode — `width`, `height`, `random()`, `noise()`, etc. are all global

### Working with AI
This repo includes a `CLAUDE.md` file that contains the full project specification, architecture, and conventions. When working with Claude Code or similar AI tools, it will automatically pick up this context. The file documents:
- Namespace patterns and file responsibilities
- Default values and algorithms
- What NOT to do (no npm, no frameworks, keep it simple)

---

## Tech Stack

- [p5.js](https://p5js.org/) 1.11.11 — Canvas rendering (CDN)
- [gif.js](https://jnordberg.github.io/gif.js/) 0.2.0 — Client-side GIF encoding (CDN + vendored worker)
- MediaRecorder API — WebM video capture (native browser)
- Vanilla HTML/CSS/JS — No frameworks, no build tools

## License

MIT
