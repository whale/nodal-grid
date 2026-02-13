# Contributing to Nodal Grid

A guide for forking, running, modifying, and deploying your own version of Nodal Grid.

---

## Fork & Run

1. Go to [github.com/whale/nodal-grid](https://github.com/whale/nodal-grid)
2. Click **Fork** (top right)
3. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/nodal-grid.git
   cd nodal-grid
   ```
4. Open `index.html` in your browser — that's it, no install needed

For GIF export to work you need a local server (the gif.js worker requires same-origin):
```bash
python3 -m http.server 8765
# Open http://localhost:8765
```

---

## Project Structure

```
nodal-grid/
  index.html          ← Open this. Loads everything.
  style.css           ← Dark theme, sidebar layout
  CLAUDE.md           ← Full spec for AI-assisted development
  js/
    grid.js           ← Grid generation (isometric/triangular/square)
    nodes.js          ← Node placement on grid intersections
    connections.js    ← Circuit routing between nodes (BFS pathfinding)
    animation.js      ← Stream, line draw, and glow animation modes
    export.js         ← PNG / GIF / WebM export
    ui.js             ← Sidebar controls, presets, settings save/load
    app.js            ← p5.js setup/draw loop, config save/load
  lib/
    gif.worker.js     ← Vendored gif.js worker (don't delete)
```

Scripts load in order — `grid.js` first, `app.js` last. Each file adds to `window.Nodal` (e.g. `Nodal.Grid`, `Nodal.Nodes`). There are no build tools, no npm, no frameworks.

---

## How to Make Changes

### Change defaults
Edit the properties at the top of each module. For example, to change the default node count from 8 to 12:

In `js/nodes.js`:
```js
Nodal.Nodes = {
  count: 12,    // was 8
  ...
```

### Add a new animation preset
In `js/ui.js`, find the `presets` array inside `_buildAnimationSection` and add an entry:

```js
{
  name: 'My Preset',
  desc: 'Short description for tooltip',
  apply: function() {
    Nodal.Animation.mode = 'particle';
    Nodal.Animation.behavior = 'loop';
    Nodal.Animation.speed = 60;
    Nodal.Animation.streamLength = 0.15;
    Nodal.Animation.trailLength = 12;
    Nodal.Animation.nodePulse = true;
    Nodal.Connections.count = 10;
    Nodal.Connections.thickness = 2;
  }
}
```

### Add a new sidebar control
Use the helper methods in `Nodal.UI`:

```js
// Slider
this._addSlider('Label', min, max, currentValue, step, function(val) {
  // do something with val
});

// Color picker
this._addColor('Label', '#c8ff00', function(val) {
  // do something with val
});

// Dropdown
this._addSelect('Label', [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' }
], currentValue, function(val) {
  // do something with val
});

// Toggle buttons
this._addToggle('Label', ['On', 'Off'], 0, function(idx) {
  // idx 0 = first button, 1 = second
});
```

### Add a new grid type
1. In `js/grid.js`, add a case in `generate()`:
   ```js
   case 'hexagonal':
     this._generateHexLattice(canvasW, canvasH);
     break;
   ```
2. Write the `_generateHexLattice` method — it needs to populate `this.vertices` (Map of id → {x, y, neighbors}), enumerate cells, then call `this._applyCellVisibility(cells, w, h)` and `this._buildFromVisibleCells(cells, w, h)`
3. Add the option to the dropdown in `js/ui.js` (`_buildGridSection`)

### Change colors / theme
- Grid line color: `Nodal.Grid.color` (default `#ffffff`)
- Node color: `Nodal.Nodes.fillColor` and `strokeColor` (default `#c8ff00`)
- Connection color: `Nodal.Connections.color` (default `#c8ff00`)
- Animation color: `Nodal.Animation.color` (default `#c8ff00`)
- Background: `Nodal.backgroundColor` (default `#333333`)
- Sidebar: edit `style.css` — background is `#252525`, accent color is `#c8ff00`

---

## Key Concepts

**Regeneration cascade** — when you change something upstream, everything downstream must regenerate:
- Grid change → call `Nodal.UI._regenerateAll()`
- Node change → call `Nodal.UI._regenerateNodes()`
- Connection change → call `Nodal.UI._regenerateConnections()`
- Visual-only change (colors, opacity) → no regen needed

**Draw order** (back to front): Background → Grid → Connections → Animation → Nodes

**Grid graph** — `Nodal.Grid.vertices` is a `Map` where each vertex has an array of `neighbors` (vertex IDs connected by grid edges). Standard graph algorithms (BFS, DFS) work on it directly.

**Animation modes**:
- `particle` (shown as "Stream" in UI) — gradient lines flowing along paths
- `linedraw` — paths draw themselves progressively
- `glow` — breathing pulse effect on all paths and nodes

---

## Deploy Your Fork

Push to your fork and enable GitHub Pages:

1. Go to your repo on GitHub
2. **Settings → Pages → Source**: select `main` branch, `/ (root)` folder
3. Click Save
4. Your site is live at `https://YOUR-USERNAME.github.io/nodal-grid/`

No build step. Any push to `main` auto-deploys.

---

## Share a Configuration

After adjusting sliders to a look you like:
- **Copy Link** (in Export section) — creates a URL with all settings encoded. Anyone opening it sees your exact configuration.
- **Copy Settings** — copies raw JSON. Paste it somewhere, use **Load Settings** to restore later.

---

## Working with AI

This repo includes `CLAUDE.md` — a detailed project specification that AI coding tools (Claude Code, Cursor, etc.) automatically pick up. It documents every algorithm, default value, and convention. If you use AI to extend the project, it will understand the codebase from that file alone.

---

## Rules

- No npm, no package.json, no build tools
- No frameworks (React, Vue, etc.)
- No ES modules — use `<script>` tags
- Keep it simple enough that opening `index.html` just works
- All state on `window.Nodal.*` — easy to inspect in the browser console
