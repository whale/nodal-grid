// =============================================================================
// nodes.js — Node placement (axis + chaos) and rendering
// =============================================================================

window.Nodal = window.Nodal || {};

Nodal.Nodes = {
  list: [],
  count: 8,
  axisAngle: 45,       // degrees, 0 = right, 90 = down
  chaos: 30,            // 0-100
  style: 'circle',      // 'circle' | 'square'
  size: 12,
  fillColor: '#c8ff00',
  strokeColor: '#c8ff00',
  strokeWeight: 2,

  generate: function(canvasW, canvasH) {
    var positions = Nodal.Grid.getVisiblePositions(canvasW, canvasH, 60);
    if (positions.length === 0) return;

    var cx = canvasW / 2;
    var cy = canvasH / 2;
    var axisRad = this.axisAngle * Math.PI / 180;
    var axisVecX = Math.cos(axisRad);
    var axisVecY = Math.sin(axisRad);
    var chaosFactor = this.chaos / 100;

    // Find max extent for normalization
    var maxExtent = 0;
    for (var i = 0; i < positions.length; i++) {
      var dx = positions[i].x - cx;
      var dy = positions[i].y - cy;
      var ext = Math.sqrt(dx * dx + dy * dy);
      if (ext > maxExtent) maxExtent = ext;
    }
    if (maxExtent === 0) maxExtent = 1;

    // Score each position
    var scored = [];
    for (var i = 0; i < positions.length; i++) {
      var pos = positions[i];
      var dx = pos.x - cx;
      var dy = pos.y - cy;

      // Projection onto axis (how far along the axis direction)
      var projection = dx * axisVecX + dy * axisVecY;

      // Rejection (perpendicular distance from axis line)
      var rejX = dx - projection * axisVecX;
      var rejY = dy - projection * axisVecY;
      var rejection = Math.sqrt(rejX * rejX + rejY * rejY);

      // Directional score: favor positive projection, penalize perpendicular distance
      var dirScore = projection - rejection * 1.5;

      // Random component
      var randScore = (Math.random() - 0.5) * 2 * maxExtent;

      // Blend based on chaos
      var finalScore = dirScore * (1 - chaosFactor) + randScore * chaosFactor;

      scored.push({
        id: pos.id,
        x: pos.x,
        y: pos.y,
        score: finalScore
      });
    }

    // Sort by score descending
    scored.sort(function(a, b) { return b.score - a.score; });

    // Pick top N with minimum distance filtering
    var minDist = this.size * 4;
    var minDistSq = minDist * minDist;
    this.list = [];

    for (var i = 0; i < scored.length && this.list.length < this.count; i++) {
      var pos = scored[i];
      var tooClose = false;

      for (var j = 0; j < this.list.length; j++) {
        var n = this.list[j];
        var ddx = n.x - pos.x;
        var ddy = n.y - pos.y;
        if (ddx * ddx + ddy * ddy < minDistSq) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        this.list.push({
          id: 'node_' + this.list.length,
          vertexId: pos.id,
          x: pos.x,
          y: pos.y,
          size: this.size
        });
      }
    }
  },

  draw: function(p) {
    for (var i = 0; i < this.list.length; i++) {
      var node = this.list[i];
      var s = node.size;

      p.push();
      p.translate(node.x, node.y);

      if (this.style === 'circle') {
        // Outer circle (stroke only)
        p.noFill();
        p.stroke(this.strokeColor);
        p.strokeWeight(this.strokeWeight);
        p.ellipse(0, 0, s * 2, s * 2);

        // Center dot
        p.noStroke();
        p.fill(this.fillColor);
        p.ellipse(0, 0, 4, 4);
      } else {
        // Square style
        p.noFill();
        p.stroke(this.strokeColor);
        p.strokeWeight(this.strokeWeight);
        p.rectMode(p.CENTER);
        p.rect(0, 0, s * 2, s * 2);

        // Center dot
        p.noStroke();
        p.fill(this.fillColor);
        p.ellipse(0, 0, 4, 4);
      }

      p.pop();
    }
  }
};
