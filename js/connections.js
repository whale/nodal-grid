// =============================================================================
// connections.js — BFS pathfinding along grid edges + curved path rendering
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

    // Build all possible node pairs
    var pairs = [];
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].x - nodes[j].x;
        var dy = nodes[i].y - nodes[j].y;
        pairs.push({ from: i, to: j, dist: Math.sqrt(dx * dx + dy * dy) });
      }
    }

    // Shuffle for variety (seeded via p5 random)
    for (var i = pairs.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var tmp = pairs[i]; pairs[i] = pairs[j]; pairs[j] = tmp;
    }

    // Ensure coverage: prioritize connecting under-represented nodes
    var nodeConns = {};
    for (var i = 0; i < nodes.length; i++) nodeConns[i] = 0;
    var selected = [];
    var used = {};

    // First pass: ensure every node gets at least one connection
    for (var p = 0; p < pairs.length && selected.length < this.count; p++) {
      var pair = pairs[p];
      if (nodeConns[pair.from] === 0 || nodeConns[pair.to] === 0) {
        var key = pair.from + '_' + pair.to;
        if (!used[key]) {
          selected.push(pair);
          used[key] = true;
          nodeConns[pair.from]++;
          nodeConns[pair.to]++;
        }
      }
    }

    // Second pass: fill remaining slots with random pairs
    for (var p = 0; p < pairs.length && selected.length < this.count; p++) {
      var pair = pairs[p];
      var key = pair.from + '_' + pair.to;
      if (!used[key]) {
        selected.push(pair);
        used[key] = true;
        nodeConns[pair.from]++;
        nodeConns[pair.to]++;
      }
    }

    // Build paths for selected connections
    for (var s = 0; s < selected.length; s++) {
      var pair = selected[s];
      var fromNode = nodes[pair.from];
      var toNode = nodes[pair.to];

      var path = this._findPath(fromNode.vertexId, toNode.vertexId);
      if (path) {
        var pathPoints = [];
        for (var k = 0; k < path.length; k++) {
          var v = Nodal.Grid.vertices.get(path[k]);
          if (v) pathPoints.push({ x: v.x, y: v.y });
        }

        // Smooth angular grid path into natural curves
        var smoothed = this._smoothPath(pathPoints);

        this.list.push({
          id: 'conn_' + this.list.length,
          fromNodeId: fromNode.id,
          toNodeId: toNode.id,
          path: path,
          pathPoints: smoothed,
          totalLength: this._computePathLength(smoothed)
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

  // Catmull-Rom spline smoothing — turns angular grid paths into natural curves
  _smoothPath: function(points) {
    if (points.length < 3) return points.slice();

    var resolution = 4; // subdivisions per segment
    var result = [];
    var n = points.length;

    for (var i = 0; i < n - 1; i++) {
      var p0 = points[Math.max(0, i - 1)];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[Math.min(n - 1, i + 2)];

      for (var t = 0; t < resolution; t++) {
        var s = t / resolution;
        var s2 = s * s;
        var s3 = s2 * s;

        // Standard Catmull-Rom interpolation
        var x = 0.5 * ((2*p1.x) + (-p0.x + p2.x)*s +
          (2*p0.x - 5*p1.x + 4*p2.x - p3.x)*s2 +
          (-p0.x + 3*p1.x - 3*p2.x + p3.x)*s3);
        var y = 0.5 * ((2*p1.y) + (-p0.y + p2.y)*s +
          (2*p0.y - 5*p1.y + 4*p2.y - p3.y)*s2 +
          (-p0.y + 3*p1.y - 3*p2.y + p3.y)*s3);

        result.push({ x: x, y: y });
      }
    }

    // Add final endpoint
    result.push(points[n - 1]);
    return result;
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
