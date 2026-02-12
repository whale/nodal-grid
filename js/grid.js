// =============================================================================
// grid.js — Grid generation (isometric/triangular/square) + graph structure
// =============================================================================

window.Nodal = window.Nodal || {};

Nodal.Grid = {
  type: 'isometric',
  cellSize: 60,
  color: '#ffffff',
  opacity: 0.4,

  // Boundary/shape controls
  extent: 70,             // 0-100: how much of canvas the grid fills
  shapeChaos: 30,         // 0-100: irregularity of boundary edge
  shapeDirection: 90,     // degrees: axis bias for grid shape elongation
  shapeElongation: 50,    // 0-100: how stretched along the direction axis

  // Generated data
  vertices: new Map(),
  edges: [],
  lines: [],              // { x1, y1, x2, y2, opacity }
  _visibleSet: null,      // Set of visible vertex IDs

  generate: function(canvasW, canvasH, type, cellSize) {
    this.type = type || this.type;
    this.cellSize = cellSize || this.cellSize;
    this.vertices = new Map();
    this.edges = [];
    this.lines = [];
    this._visibleSet = new Set();

    switch (this.type) {
      case 'isometric':
        this._generateIsometric(canvasW, canvasH);
        break;
      case 'triangular':
        this._generateTriangular(canvasW, canvasH);
        break;
      case 'square':
        this._generateSquare(canvasW, canvasH);
        break;
    }

    // Apply boundary mask
    this._applyBoundary(canvasW, canvasH);
  },

  // ---- Isometric hex/cube grid ----
  _generateIsometric: function(w, h) {
    var sqrt3 = Math.sqrt(3);
    var cs = this.cellSize;
    var margin = 4;

    var cols = Math.ceil(w / cs) + margin * 2;
    var rows = Math.ceil(h / (cs * sqrt3 / 2)) + margin * 2;

    var offsetX = w / 2 - (cols / 2) * cs;
    var offsetY = h / 2 - (rows / 2) * cs * sqrt3 / 2;

    for (var r = -margin; r <= rows; r++) {
      for (var q = -margin; q <= cols; q++) {
        var x = offsetX + (q + r * 0.5) * cs;
        var y = offsetY + r * (cs * sqrt3 / 2);
        var id = q + '_' + r;
        this.vertices.set(id, {
          id: id, x: x, y: y, q: q, r: r,
          neighbors: [], visibility: 1
        });
      }
    }

    var directions = [
      [1, 0], [-1, 0],
      [0, 1], [0, -1],
      [1, -1], [-1, 1]
    ];

    var self = this;
    this.vertices.forEach(function(v) {
      for (var d = 0; d < directions.length; d++) {
        var dq = directions[d][0];
        var dr = directions[d][1];
        var nId = (v.q + dq) + '_' + (v.r + dr);
        if (self.vertices.has(nId)) {
          v.neighbors.push(nId);
        }
      }
    });
  },

  // ---- Triangular tessellation ----
  _generateTriangular: function(w, h) {
    this._generateIsometric(w, h);
  },

  // ---- Square/rectangular grid ----
  _generateSquare: function(w, h) {
    var cs = this.cellSize;
    var margin = 2;
    var cols = Math.ceil(w / cs) + margin * 2;
    var rows = Math.ceil(h / cs) + margin * 2;

    var offsetX = (w - cols * cs) / 2;
    var offsetY = (h - rows * cs) / 2;

    for (var r = 0; r <= rows; r++) {
      for (var c = 0; c <= cols; c++) {
        var x = offsetX + c * cs;
        var y = offsetY + r * cs;
        var id = c + '_' + r;
        this.vertices.set(id, {
          id: id, x: x, y: y, q: c, r: r,
          neighbors: [], visibility: 1
        });
      }
    }

    var directions = [
      [1, 0], [-1, 0], [0, 1], [0, -1]
    ];

    var self = this;
    this.vertices.forEach(function(v) {
      for (var d = 0; d < directions.length; d++) {
        var dc = directions[d][0];
        var dr = directions[d][1];
        var nId = (v.q + dc) + '_' + (v.r + dr);
        if (self.vertices.has(nId)) {
          v.neighbors.push(nId);
        }
      }
    });
  },

  // ---- Boundary mask ----
  // Determines which vertices are visible and creates the grid shape
  _applyBoundary: function(canvasW, canvasH) {
    var cx = canvasW / 2;
    var cy = canvasH / 2;
    var extent = this.extent / 100;
    var chaos = this.shapeChaos / 100;
    var dirRad = this.shapeDirection * Math.PI / 180;
    var elongation = 1 + (this.shapeElongation / 100) * 2; // 1 to 3x stretch

    // Base radius — how far the grid extends from center
    var baseRadius = Math.min(canvasW, canvasH) * 0.5 * extent;

    // Noise seed for consistent boundary shape
    var noiseSeedVal = 42;

    var self = this;
    var visibilityMap = new Map();

    // Calculate visibility for each vertex
    this.vertices.forEach(function(v) {
      var dx = v.x - cx;
      var dy = v.y - cy;

      // Rotate into the direction frame
      var cosD = Math.cos(-dirRad);
      var sinD = Math.sin(-dirRad);
      var rx = dx * cosD - dy * sinD;
      var ry = dx * sinD + dy * cosD;

      // Apply elongation along the direction axis
      var normDist = Math.sqrt((rx / elongation) * (rx / elongation) + ry * ry);

      // Noise-based boundary variation for stepped/blocky edges
      var angle = Math.atan2(dy, dx);
      // Layered sine waves for organic shape
      var noiseVal = 0;
      noiseVal += Math.sin(angle * 2.5 + noiseSeedVal) * 0.4;
      noiseVal += Math.sin(angle * 5.3 + noiseSeedVal * 2.1) * 0.25;
      noiseVal += Math.sin(angle * 9.7 + noiseSeedVal * 3.7) * 0.15;

      // Quantize to cell-size steps for stacked-block feel
      var stepSize = self.cellSize / baseRadius;
      var snappedNoise = Math.round(noiseVal / stepSize) * stepSize;

      // Effective boundary radius at this angle
      var boundaryRadius = baseRadius * (1 + snappedNoise * chaos * 0.8);

      // Visibility: 1 inside, 0 outside, tight falloff at edge
      var falloffWidth = self.cellSize * 1.2;
      var visibility;
      if (normDist < boundaryRadius - falloffWidth) {
        visibility = 1;
      } else if (normDist > boundaryRadius) {
        visibility = 0;
      } else {
        // Short falloff for semi-transparent edge cells
        visibility = 1 - (normDist - (boundaryRadius - falloffWidth)) / falloffWidth;
        visibility = Math.max(0, Math.min(1, visibility));
        // Snap to steps for blocky feel
        visibility = Math.round(visibility * 3) / 3;
      }

      v.visibility = visibility;
      visibilityMap.set(v.id, visibility);
    });

    // Build edges and lines — only where both vertices are sufficiently visible
    var minVis = 0.05;
    this.edges = [];
    this.lines = [];
    this._visibleSet = new Set();

    this.vertices.forEach(function(v) {
      if (v.visibility < minVis) return;

      var hasVisibleNeighbor = false;

      for (var i = 0; i < v.neighbors.length; i++) {
        var nId = v.neighbors[i];
        var n = self.vertices.get(nId);
        if (!n || n.visibility < minVis) continue;

        hasVisibleNeighbor = true;

        // Add edge once (avoid duplicates by comparing IDs)
        if (v.id < nId) {
          self.edges.push([v.id, nId]);
          // Edge opacity is the minimum of both endpoint visibilities
          var edgeOpacity = Math.min(v.visibility, n.visibility);
          self.lines.push({
            x1: v.x, y1: v.y,
            x2: n.x, y2: n.y,
            opacity: edgeOpacity
          });
        }
      }

      if (hasVisibleNeighbor) {
        self._visibleSet.add(v.id);
      }
    });

    // Clean up neighbor lists to only include visible neighbors
    // This ensures pathfinding only uses the visible grid
    this.vertices.forEach(function(v) {
      if (!self._visibleSet.has(v.id)) return;
      v.neighbors = v.neighbors.filter(function(nId) {
        return self._visibleSet.has(nId);
      });
    });
  },

  // ---- Rendering ----
  draw: function(p) {
    var c = p.color(this.color);
    var r = p.red(c);
    var g = p.green(c);
    var b = p.blue(c);
    var baseAlpha = this.opacity * 255;

    p.strokeWeight(1);
    p.noFill();

    for (var i = 0; i < this.lines.length; i++) {
      var ln = this.lines[i];
      p.stroke(r, g, b, baseAlpha * ln.opacity);
      p.line(ln.x1, ln.y1, ln.x2, ln.y2);
    }
  },

  // Get the nearest vertex to a pixel position
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

  // Return all vertex positions (for node placement)
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

  // Get visible positions only (within canvas bounds with padding)
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
