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

    // Strategy: low chaos = nodes cluster tightly along the axis LINE through center
    // (both directions). High chaos = nodes scatter randomly.
    // Score = closeness to axis line (low rejection) blended with random.

    var maxRejection = 0;
    var rejections = [];
    for (var i = 0; i < positions.length; i++) {
      var pos = positions[i];
      var dx = pos.x - cx;
      var dy = pos.y - cy;
      var projection = dx * axisVecX + dy * axisVecY;
      var rejX = dx - projection * axisVecX;
      var rejY = dy - projection * axisVecY;
      var rejection = Math.sqrt(rejX * rejX + rejY * rejY);
      rejections.push(rejection);
      if (rejection > maxRejection) maxRejection = rejection;
    }
    if (maxRejection === 0) maxRejection = 1;

    // Score each position
    var scored = [];
    for (var i = 0; i < positions.length; i++) {
      var pos = positions[i];

      // Axis-alignment score: 1 = on the axis, 0 = far from axis
      var axisScore = 1 - (rejections[i] / maxRejection);

      // Random component (0 to 1)
      var randScore = Math.random();

      // Blend: at chaos=0, pure axis alignment. At chaos=100, pure random.
      var finalScore = axisScore * (1 - chaosFactor) + randScore * chaosFactor;

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
    var minDist = Math.max(this.size * 3, Math.min(canvasW, canvasH) / (this.count + 4));
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
