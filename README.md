# Nodal Grid

A browser-based interactive tool for generating animated node-and-edge compositions on geometric grids. Built with p5.js — no build tools, no dependencies to install.

## Quick Start

1. Open `index.html` in your browser
2. Adjust controls in the sidebar
3. Export your creation as PNG, GIF, or WebM

For local development with a server (needed for GIF export):
```bash
python3 -m http.server 8765
# Then open http://localhost:8765
```

## Features

### Grid Types
- **Isometric (Hex)** — 3D cube wireframe look (default)
- **Triangular** — Flat triangle tessellation
- **Square** — Classic rectangular grid

### Node Placement
- Nodes snap to grid intersections
- **Axis angle** controls the directional bias of node placement
- **Chaos** dial (0-100%) controls scatter: low = tight line, high = random

### Connections
- Paths follow grid edges (BFS pathfinding), creating angular polylines
- Configurable count, color, thickness, and solid/dashed style

### Animation Modes
- **Particle Travel** — Dots move along connection paths
- **Line Draw** — Connections draw themselves progressively
- **Glow / Pulse** — Breathing light effect on nodes and edges

### Export
- **PNG** — Current frame with background
- **PNG (transparent)** — Current frame, no background
- **GIF** — Looping animation
- **WebM** — Looping video

## Deployment

This project is designed for GitHub Pages. Push to a repo and enable Pages from the main branch — no build step needed.

## Tech Stack

- [p5.js](https://p5js.org/) — Canvas rendering
- [gif.js](https://jnordberg.github.io/gif.js/) — Client-side GIF encoding
- MediaRecorder API — WebM video capture
- Vanilla HTML/CSS/JS — No frameworks, no build tools

## License

MIT
