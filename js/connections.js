// =============================================================================
// connections.js — BFS pathfinding along grid edges + rendering
// =============================================================================

window.Nodal = window.Nodal || {};

Nodal.Connections = {
  list: [],
  count: 5,
  color: '#c8ff00',
  thickness: 2,
  style: 'solid',       // 'solid' | 'dashed'
  dashLength: 8,
  dashGap: 6,

  generate: function() {
    this.list = [];
    var nodes = Nodal.Nodes.list;
    if (nodes.length < 2) return;

    // Build a list of all possible node pairs sorted by euclidean distance
    var pairs = [];
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].x - nodes[j].x;
        var dy = nodes[i].y - nodes[j].y;
        pairs.push({
          from: i,
          to: j,
          dist: Math.sqrt(dx * dx + dy * dy)
        });
      }
    }
    pairs.sort(function(a, b) { return a.dist - b.dist; });

    // Pick up to this.count connections, preferring shorter distances
    var used = 0;
    for (var p = 0; p < pairs.length && used < this.count; p++) {
      var pair = pairs[p];
      var fromNode = nodes[pair.from];
      var toNode = nodes[pair.to];

      // BFS pathfind along grid edges
      var path = this._findPath(fromNode.vertexId, toNode.vertexId);
      if (path) {
        // Convert vertex IDs to pixel coordinates
        var pathPoints = [];
        for (var k = 0; k < path.length; k++) {
          var v = Nodal.Grid.vertices.get(path[k]);
          if (v) pathPoints.push({ x: v.x, y: v.y });
        }

        this.list.push({
          id: 'conn_' + used,
          fromNodeId: fromNode.id,
          toNodeId: toNode.id,
          path: path,
          pathPoints: pathPoints,
          totalLength: this._computePathLength(pathPoints)
        });
        used++;
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
        // Reconstruct path
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

    return null; // No path found
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
