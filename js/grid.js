// =============================================================================
// grid.js — Grid generation (isometric/triangular/square) + graph structure
// =============================================================================

window.Nodal = window.Nodal || {};

Nodal.Grid = {
  type: 'isometric',
  cellSize: 60,
  color: '#ffffff',
  opacity: 0.4,

  // Shape controls
  shapeChaos: 0,          // 0-100: 0=full grid, 100=very staggered with holes
  shapeDirection: 90,     // degrees: axis bias for where grid is denser
  shapeElongation: 50,    // 0-100: stretch along direction axis

  // Generated data
  vertices: new Map(),
  edges: [],
  lines: [],
  _visibleSet: null,
  _visibleEdgeSet: null,

  generate: function(canvasW, canvasH, type, cellSize) {
    this.type = type || this.type;
    this.cellSize = cellSize || this.cellSize;
    this.vertices = new Map();
    this.edges = [];
    this.lines = [];
    this._visibleSet = new Set();
    this._visibleEdgeSet = new Set();

    switch (this.type) {
      case 'isometric':
      case 'triangular':
        this._generateTriLattice(canvasW, canvasH);
        break;
      case 'square':
        this._generateSquareLattice(canvasW, canvasH);
        break;
    }
  },

  // =========================================================================
  // TRIANGULAR LATTICE (used by both isometric and triangular grid types)
  // =========================================================================
  _generateTriLattice: function(w, h) {
    var sqrt3 = Math.sqrt(3);
    var cs = this.cellSize;
    var margin = 4;

    var cols = Math.ceil(w / cs) + margin * 2;
    var rows = Math.ceil(h / (cs * sqrt3 / 2)) + margin * 2;

    var offsetX = w / 2 - (cols / 2) * cs;
    var offsetY = h / 2 - (rows / 2) * cs * sqrt3 / 2;

    // Step 1: Generate all vertices
    for (var r = -margin; r <= rows + margin; r++) {
      for (var q = -margin; q <= cols + margin; q++) {
        var x = offsetX + (q + r * 0.5) * cs;
        var y = offsetY + r * (cs * sqrt3 / 2);
        var id = q + '_' + r;
        this.vertices.set(id, {
          id: id, x: x, y: y, q: q, r: r,
          neighbors: []
        });
      }
    }

    // Step 2: Enumerate all triangular cells
    // Type A: (q,r), (q+1,r), (q,r+1)   — "downward" pointing
    // Type B: (q+1,r), (q+1,r+1), (q,r+1) — "upward" pointing
    var cells = [];
    for (var r = -margin; r <= rows + margin - 1; r++) {
      for (var q = -margin; q <= cols + margin - 1; q++) {
        var a = q + '_' + r;
        var b = (q + 1) + '_' + r;
        var c = q + '_' + (r + 1);
        var d = (q + 1) + '_' + (r + 1);

        if (this.vertices.has(a) && this.vertices.has(b) && this.vertices.has(c)) {
          var va = this.vertices.get(a);
          var vb = this.vertices.get(b);
          var vc = this.vertices.get(c);
          cells.push({
            verts: [a, b, c],
            cx: (va.x + vb.x + vc.x) / 3,
            cy: (va.y + vb.y + vc.y) / 3,
            edges: [this._edgeKey(a, b), this._edgeKey(a, c), this._edgeKey(b, c)]
          });
        }

        if (this.vertices.has(b) && this.vertices.has(d) && this.vertices.has(c)) {
          var vb2 = this.vertices.get(b);
          var vd = this.vertices.get(d);
          var vc2 = this.vertices.get(c);
          cells.push({
            verts: [b, d, c],
            cx: (vb2.x + vd.x + vc2.x) / 3,
            cy: (vb2.y + vd.y + vc2.y) / 3,
            edges: [this._edgeKey(b, d), this._edgeKey(b, c), this._edgeKey(d, c)]
          });
        }
      }
    }

    // Step 3: Determine cell visibility
    this._applyCellVisibility(cells, w, h);

    // Step 4: Build visible edges and neighbor lists
    this._buildFromVisibleCells(cells, w, h);
  },

  // =========================================================================
  // SQUARE LATTICE
  // =========================================================================
  _generateSquareLattice: function(w, h) {
    var cs = this.cellSize;
    var margin = 3;
    var cols = Math.ceil(w / cs) + margin * 2;
    var rows = Math.ceil(h / cs) + margin * 2;

    var offsetX = (w - cols * cs) / 2;
    var offsetY = (h - rows * cs) / 2;

    // Step 1: Generate vertices
    for (var r = -margin; r <= rows + margin; r++) {
      for (var c = -margin; c <= cols + margin; c++) {
        var x = offsetX + c * cs;
        var y = offsetY + r * cs;
        var id = c + '_' + r;
        this.vertices.set(id, {
          id: id, x: x, y: y, q: c, r: r,
          neighbors: []
        });
      }
    }

    // Step 2: Enumerate square cells
    var cells = [];
    for (var r = -margin; r <= rows + margin - 1; r++) {
      for (var c = -margin; c <= cols + margin - 1; c++) {
        var tl = c + '_' + r;
        var tr = (c + 1) + '_' + r;
        var bl = c + '_' + (r + 1);
        var br = (c + 1) + '_' + (r + 1);

        if (this.vertices.has(tl) && this.vertices.has(tr) &&
            this.vertices.has(bl) && this.vertices.has(br)) {
          var vtl = this.vertices.get(tl);
          var vtr = this.vertices.get(tr);
          var vbl = this.vertices.get(bl);
          var vbr = this.vertices.get(br);
          cells.push({
            verts: [tl, tr, bl, br],
            cx: (vtl.x + vtr.x + vbl.x + vbr.x) / 4,
            cy: (vtl.y + vtr.y + vbl.y + vbr.y) / 4,
            edges: [
              this._edgeKey(tl, tr), this._edgeKey(bl, br),
              this._edgeKey(tl, bl), this._edgeKey(tr, br)
            ]
          });
        }
      }
    }

    // Step 3: Determine cell visibility
    this._applyCellVisibility(cells, w, h);

    // Step 4: Build
    this._buildFromVisibleCells(cells, w, h);
  },

  // =========================================================================
  // CELL VISIBILITY — shared logic
  // =========================================================================
  _applyCellVisibility: function(cells, canvasW, canvasH) {
    var chaos = this.shapeChaos / 100;
    var dirRad = this.shapeDirection * Math.PI / 180;
    var elongation = 1 + (this.shapeElongation / 100) * 2;
    var cx = canvasW / 2;
    var cy = canvasH / 2;
    var maxRadius = Math.sqrt(cx * cx + cy * cy);

    // At chaos=0, everything is visible. At chaos=100, lots of holes.
    if (chaos < 0.01) {
      // Full grid — mark everything on-screen as visible
      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        // Only include cells within a generous canvas margin
        if (cell.cx > -this.cellSize * 2 && cell.cx < canvasW + this.cellSize * 2 &&
            cell.cy > -this.cellSize * 2 && cell.cy < canvasH + this.cellSize * 2) {
          cell.visible = true;
        } else {
          cell.visible = false;
        }
      }
      return;
    }

    // Noise scale — bigger chaos = bigger hole features
    var noiseScale = 0.006 + chaos * 0.018;

    // Threshold: at low chaos barely anything removed, at high chaos ~60% removed
    // The score ranges 0-1, threshold controls what fraction is kept
    var threshold = 0.5 + chaos * 0.22; // chaos 0→0.5, chaos 100→0.72

    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];

      // Skip cells way off screen
      if (cell.cx < -this.cellSize * 3 || cell.cx > canvasW + this.cellSize * 3 ||
          cell.cy < -this.cellSize * 3 || cell.cy > canvasH + this.cellSize * 3) {
        cell.visible = false;
        continue;
      }

      // Distance from center (normalized 0-1)
      var dx = cell.cx - cx;
      var dy = cell.cy - cy;
      var cosD = Math.cos(-dirRad);
      var sinD = Math.sin(-dirRad);
      var rx = dx * cosD - dy * sinD;
      var ry = dx * sinD + dy * cosD;
      var normDist = Math.sqrt((rx / elongation) * (rx / elongation) + ry * ry) / maxRadius;

      // Perlin noise (0-1 range)
      var n = noise(cell.cx * noiseScale + 100, cell.cy * noiseScale + 100);

      // Score: strong center-bias + noise. Grid stays centered,
      // holes appear more toward edges. Center cells are always kept.
      var centerBias = 1 - normDist;
      // Center guarantee: cells very close to center always score high
      var centerBoost = Math.max(0, 1 - normDist * 2.5);
      centerBoost = centerBoost * centerBoost; // quadratic falloff
      var noiseMix = chaos;
      var score = centerBias * (1 - noiseMix * 0.5) + n * (0.2 + noiseMix * 0.5) + centerBoost * 0.3;

      cell.visible = score > threshold;
    }

    // Ensure connectivity: flood-fill from the cell nearest to center
    this._ensureConnectivity(cells);
  },

  // Flood-fill to keep only the largest connected component
  _ensureConnectivity: function(cells) {
    // Build adjacency: two cells are adjacent if they share an edge
    var edgeToCells = {};
    for (var i = 0; i < cells.length; i++) {
      if (!cells[i].visible) continue;
      cells[i]._idx = i;
      for (var e = 0; e < cells[i].edges.length; e++) {
        var ek = cells[i].edges[e];
        if (!edgeToCells[ek]) edgeToCells[ek] = [];
        edgeToCells[ek].push(i);
      }
    }

    // Build cell neighbor lists
    var cellNeighbors = {};
    for (var ek in edgeToCells) {
      var list = edgeToCells[ek];
      if (list.length === 2) {
        var a = list[0], b = list[1];
        if (!cellNeighbors[a]) cellNeighbors[a] = [];
        if (!cellNeighbors[b]) cellNeighbors[b] = [];
        cellNeighbors[a].push(b);
        cellNeighbors[b].push(a);
      }
    }

    // Find connected components
    var visited = {};
    var components = [];

    for (var i = 0; i < cells.length; i++) {
      if (!cells[i].visible || visited[i]) continue;

      var component = [];
      var queue = [i];
      visited[i] = true;

      while (queue.length > 0) {
        var ci = queue.shift();
        component.push(ci);
        var neighbors = cellNeighbors[ci] || [];
        for (var n = 0; n < neighbors.length; n++) {
          var ni = neighbors[n];
          if (!visited[ni] && cells[ni].visible) {
            visited[ni] = true;
            queue.push(ni);
          }
        }
      }

      components.push(component);
    }

    // Keep only the largest component
    if (components.length <= 1) return;

    var largest = components[0];
    for (var c = 1; c < components.length; c++) {
      if (components[c].length > largest.length) {
        largest = components[c];
      }
    }

    var keepSet = {};
    for (var k = 0; k < largest.length; k++) {
      keepSet[largest[k]] = true;
    }

    for (var i = 0; i < cells.length; i++) {
      if (cells[i].visible && !keepSet[i]) {
        cells[i].visible = false;
      }
    }
  },

  // =========================================================================
  // BUILD edges/lines/neighbors from visible cells
  // =========================================================================
  _buildFromVisibleCells: function(cells, canvasW, canvasH) {
    var visibleEdges = {};  // edgeKey → true
    var visibleVerts = {};  // vertexId → true

    for (var i = 0; i < cells.length; i++) {
      if (!cells[i].visible) continue;
      for (var e = 0; e < cells[i].edges.length; e++) {
        visibleEdges[cells[i].edges[e]] = true;
      }
      for (var v = 0; v < cells[i].verts.length; v++) {
        visibleVerts[cells[i].verts[v]] = true;
      }
    }

    this._visibleSet = new Set();
    this._visibleEdgeSet = new Set();
    this.edges = [];
    this.lines = [];

    // Build edges and lines
    var self = this;
    var addedEdges = {};

    for (var ek in visibleEdges) {
      if (addedEdges[ek]) continue;
      addedEdges[ek] = true;

      var parts = ek.split('|');
      var v1 = this.vertices.get(parts[0]);
      var v2 = this.vertices.get(parts[1]);
      if (!v1 || !v2) continue;

      this.edges.push([parts[0], parts[1]]);
      this.lines.push({ x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y });
      this._visibleEdgeSet.add(ek);
      this._visibleSet.add(parts[0]);
      this._visibleSet.add(parts[1]);
    }

    // Build neighbor lists (only visible connections)
    this.vertices.forEach(function(v) {
      v.neighbors = [];
    });

    for (var ek in visibleEdges) {
      var parts = ek.split('|');
      var v1 = this.vertices.get(parts[0]);
      var v2 = this.vertices.get(parts[1]);
      if (v1 && v2 && this._visibleSet.has(parts[0]) && this._visibleSet.has(parts[1])) {
        v1.neighbors.push(parts[1]);
        v2.neighbors.push(parts[0]);
      }
    }
  },

  // Canonical edge key — always sorted so (a,b) == (b,a)
  _edgeKey: function(id1, id2) {
    return id1 < id2 ? id1 + '|' + id2 : id2 + '|' + id1;
  },

  // ---- Rendering ----
  draw: function(p) {
    var c = p.color(this.color);
    var r = p.red(c);
    var g = p.green(c);
    var b = p.blue(c);
    var a = this.opacity * 255;

    p.stroke(r, g, b, a);
    p.strokeWeight(1);
    p.noFill();

    for (var i = 0; i < this.lines.length; i++) {
      var ln = this.lines[i];
      p.line(ln.x1, ln.y1, ln.x2, ln.y2);
    }
  },

  nearestVertex: function(px, py) {
    var best = null;
    var bestDist = Infinity;
    var self = this;
    this.vertices.forEach(function(v) {
      if (!self._visibleSet.has(v.id)) return;
      var dx = v.x - px;
      var dy = v.y - py;
      var d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = v;
      }
    });
    return best;
  },

  getAllPositions: function() {
    var result = [];
    var self = this;
    this.vertices.forEach(function(v) {
      if (self._visibleSet.has(v.id)) {
        result.push({ id: v.id, x: v.x, y: v.y });
      }
    });
    return result;
  },

  getVisiblePositions: function(canvasW, canvasH, padding) {
    padding = padding || 40;
    var result = [];
    var self = this;
    this.vertices.forEach(function(v) {
      if (!self._visibleSet.has(v.id)) return;
      if (v.x >= padding && v.x <= canvasW - padding &&
          v.y >= padding && v.y <= canvasH - padding) {
        result.push({ id: v.id, x: v.x, y: v.y });
      }
    });
    return result;
  }
};
