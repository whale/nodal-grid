// =============================================================================
// connections.js — Multi-node circuit routing along grid edges + rendering
// =============================================================================

window.Nodal = window.Nodal || {};

Nodal.Connections = {
  list: [],
  count: 8,
  color: '#c8ff00',
  thickness: 2,
  style: 'solid',       // 'solid' | 'dashed'
  dashLength: 8,
  dashGap: 6,

  generate: function() {
    this.list = [];
    var nodes = Nodal.Nodes.list;
    if (nodes.length < 2) return;

    for (var c = 0; c < this.count; c++) {
      // Each circuit visits 3-6 random nodes (capped by available)
      var numStops = 3 + Math.floor(random() * 4);
      numStops = Math.min(numStops, nodes.length);

      // Pick random unique node indices for this circuit
      var pool = [];
      for (var i = 0; i < nodes.length; i++) pool.push(i);
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(random() * (i + 1));
        var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      var stops = pool.slice(0, numStops);

      // Build concatenated BFS path through all stops
      var pathPoints = [];
      var valid = true;

      for (var s = 0; s < stops.length - 1; s++) {
        var fromNode = nodes[stops[s]];
        var toNode = nodes[stops[s + 1]];
        var subPath = this._findPath(fromNode.vertexId, toNode.vertexId);

        if (!subPath) { valid = false; break; }

        // Append points (skip first of subsequent segments to avoid dupes)
        for (var k = (s === 0 ? 0 : 1); k < subPath.length; k++) {
          var v = Nodal.Grid.vertices.get(subPath[k]);
          if (v) pathPoints.push({ x: v.x, y: v.y });
        }
      }

      if (valid && pathPoints.length >= 2) {
        this.list.push({
          id: 'conn_' + this.list.length,
          pathPoints: pathPoints,
          totalLength: this._computePathLength(pathPoints)
        });
      }
    }
  },

  // BFS shortest path over grid graph
  _findPath: function(startId, endId) {
    if (startId === endId) return [startId];
    if (!Nodal.Grid.vertices.has(startId) || !Nodal.Grid.vertices.has(endId)) {
      return null;
    }

    var queue = [startId];
    var visited = {};
    visited[startId] = true;
    var parent = {};

    while (queue.length > 0) {
      var current = queue.shift();

      if (current === endId) {
        var path = [];
        var node = endId;
        while (node !== undefined) {
          path.unshift(node);
          node = parent[node];
        }
        return path;
      }

      var vertex = Nodal.Grid.vertices.get(current);
      if (!vertex) continue;

      for (var i = 0; i < vertex.neighbors.length; i++) {
        var neighborId = vertex.neighbors[i];
        if (!visited[neighborId]) {
          visited[neighborId] = true;
          parent[neighborId] = current;
          queue.push(neighborId);
        }
      }
    }

    return null;
  },

  _computePathLength: function(points) {
    var total = 0;
    for (var i = 0; i < points.length - 1; i++) {
      var dx = points[i + 1].x - points[i].x;
      var dy = points[i + 1].y - points[i].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  },

  // Get a point along a path at parameter t (0 to 1)
  getPointOnPath: function(pathPoints, t) {
    if (pathPoints.length === 0) return { x: 0, y: 0 };
    if (pathPoints.length === 1) return { x: pathPoints[0].x, y: pathPoints[0].y };
    if (t <= 0) return { x: pathPoints[0].x, y: pathPoints[0].y };
    if (t >= 1) {
      var last = pathPoints[pathPoints.length - 1];
      return { x: last.x, y: last.y };
    }

    var totalLen = this._computePathLength(pathPoints);
    var targetDist = t * totalLen;
    var accumulated = 0;

    for (var i = 0; i < pathPoints.length - 1; i++) {
      var dx = pathPoints[i + 1].x - pathPoints[i].x;
      var dy = pathPoints[i + 1].y - pathPoints[i].y;
      var segLen = Math.sqrt(dx * dx + dy * dy);

      if (accumulated + segLen >= targetDist) {
        var localT = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
        return {
          x: pathPoints[i].x + dx * localT,
          y: pathPoints[i].y + dy * localT
        };
      }
      accumulated += segLen;
    }

    var lastPt = pathPoints[pathPoints.length - 1];
    return { x: lastPt.x, y: lastPt.y };
  },

  draw: function(p) {
    p.strokeWeight(this.thickness);
    p.stroke(this.color);
    p.noFill();

    for (var c = 0; c < this.list.length; c++) {
      var conn = this.list[c];
      var pts = conn.pathPoints;
      if (pts.length < 2) continue;

      if (this.style === 'dashed') {
        p.drawingContext.setLineDash([this.dashLength, this.dashGap]);
      } else {
        p.drawingContext.setLineDash([]);
      }

      p.beginShape();
      for (var i = 0; i < pts.length; i++) {
        p.vertex(pts[i].x, pts[i].y);
      }
      p.endShape();
    }

    // Reset dash
    p.drawingContext.setLineDash([]);
  }
};
