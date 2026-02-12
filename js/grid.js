// =============================================================================
// grid.js — Grid generation (isometric/triangular/square) + graph structure
// =============================================================================

window.Nodal = window.Nodal || {};

Nodal.Grid = {
  type: 'isometric',
  cellSize: 60,
  color: '#ffffff',
  opacity: 0.4,

  // Generated data
  vertices: new Map(),
  edges: [],
  lines: [],

  generate: function(canvasW, canvasH, type, cellSize) {
    this.type = type || this.type;
    this.cellSize = cellSize || this.cellSize;
    this.vertices = new Map();
    this.edges = [];
    this.lines = [];

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
  },

  // ---- Isometric hex/cube grid ----
  // Triangular lattice producing the 3D cube wireframe look
  _generateIsometric: function(w, h) {
    var sqrt3 = Math.sqrt(3);
    var cs = this.cellSize;
    var margin = 4;

    // How many cells to cover canvas with margin
    var cols = Math.ceil(w / cs) + margin * 2;
    var rows = Math.ceil(h / (cs * sqrt3 / 2)) + margin * 2;

    // Center the grid
    var offsetX = w / 2 - (cols / 2) * cs;
    var offsetY = h / 2 - (rows / 2) * cs * sqrt3 / 2;

    // Generate vertices
    for (var r = -margin; r <= rows; r++) {
      for (var q = -margin; q <= cols; q++) {
        var x = offsetX + (q + r * 0.5) * cs;
        var y = offsetY + r * (cs * sqrt3 / 2);
        var id = q + '_' + r;
        this.vertices.set(id, {
          id: id,
          x: x,
          y: y,
          q: q,
          r: r,
          neighbors: []
        });
      }
    }

    // 6-connected triangular lattice directions
    var directions = [
      [1, 0], [-1, 0],
      [0, 1], [0, -1],
      [1, -1], [-1, 1]
    ];

    // Build adjacency and edges
    var self = this;
    this.vertices.forEach(function(v) {
      for (var d = 0; d < directions.length; d++) {
        var dq = directions[d][0];
        var dr = directions[d][1];
        var nId = (v.q + dq) + '_' + (v.r + dr);
        if (self.vertices.has(nId)) {
          v.neighbors.push(nId);
          // Add edge once (avoid duplicates)
          if (dq > 0 || (dq === 0 && dr > 0)) {
            self.edges.push([v.id, nId]);
            var n = self.vertices.get(nId);
            self.lines.push({ x1: v.x, y1: v.y, x2: n.x, y2: n.y });
          }
        }
      }
    });
  },

  // ---- Triangular tessellation ----
  // Same lattice as isometric but rendered as explicit triangles
  _generateTriangular: function(w, h) {
    // The graph is identical to isometric — same vertex/edge structure
    this._generateIsometric(w, h);
    // Visual difference handled in draw()
  },

  // ---- Square/rectangular grid ----
  _generateSquare: function(w, h) {
    var cs = this.cellSize;
    var margin = 2;
    var cols = Math.ceil(w / cs) + margin * 2;
    var rows = Math.ceil(h / cs) + margin * 2;

    var offsetX = (w - cols * cs) / 2;
    var offsetY = (h - rows * cs) / 2;

    // Generate vertices
    for (var r = 0; r <= rows; r++) {
      for (var c = 0; c <= cols; c++) {
        var x = offsetX + c * cs;
        var y = offsetY + r * cs;
        var id = c + '_' + r;
        this.vertices.set(id, {
          id: id,
          x: x,
          y: y,
          q: c,
          r: r,
          neighbors: []
        });
      }
    }

    // 4-connected: up, down, left, right
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
          if (dc > 0 || (dc === 0 && dr > 0)) {
            self.edges.push([v.id, nId]);
            var n = self.vertices.get(nId);
            self.lines.push({ x1: v.x, y1: v.y, x2: n.x, y2: n.y });
          }
        }
      }
    });
  },

  // ---- Rendering ----
  draw: function(p) {
    var c = p.color(this.color);
    p.stroke(p.red(c), p.green(c), p.blue(c), this.opacity * 255);
    p.strokeWeight(1);
    p.noFill();

    for (var i = 0; i < this.lines.length; i++) {
      var ln = this.lines[i];
      p.line(ln.x1, ln.y1, ln.x2, ln.y2);
    }
  },

  // Get the nearest vertex to a pixel position
  nearestVertex: function(px, py) {
    var best = null;
    var bestDist = Infinity;
    this.vertices.forEach(function(v) {
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
    this.vertices.forEach(function(v) {
      result.push({ id: v.id, x: v.x, y: v.y });
    });
    return result;
  },

  // Get visible positions only (within canvas bounds with padding)
  getVisiblePositions: function(canvasW, canvasH, padding) {
    padding = padding || 40;
    var result = [];
    this.vertices.forEach(function(v) {
      if (v.x >= padding && v.x <= canvasW - padding &&
          v.y >= padding && v.y <= canvasH - padding) {
        result.push({ id: v.id, x: v.x, y: v.y });
      }
    });
    return result;
  }
};
