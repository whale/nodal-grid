// =============================================================================
// animation.js — Animation modes: Tron stream, line draw, glow/pulse
// =============================================================================

window.Nodal = window.Nodal || {};

Nodal.Animation = {
  mode: 'particle',     // 'particle' | 'linedraw' | 'glow' | 'none'
  speed: 50,            // 0-100
  playing: true,
  color: '#c8ff00',
  particleSize: 5,
  trailLength: 15,      // stream smoothness (segment count)
  glowIntensity: 60,    // 0-100 for glow/pulse mode
  streamLength: 0.12,   // fraction of path covered by the stream
  behavior: 'mirror',   // 'mirror' | 'loop'
  nodePulse: true,      // whether nodes glow when lines touch them

  // Internal state
  states: [],
  _time: 0,
  _nodeGlows: {},       // vertexId → { intensity, target }

  init: function() {
    this.states = [];
    this._time = 0;
    this._nodeGlows = {};

    var connections = Nodal.Connections.list;
    for (var i = 0; i < connections.length; i++) {
      this.states.push({
        t: 0,
        phase: i * 0.4
      });
    }

    // Initialize node glow states
    var nodes = Nodal.Nodes.list;
    for (var i = 0; i < nodes.length; i++) {
      this._nodeGlows[nodes[i].vertexId] = { intensity: 0, target: 0 };
    }
  },

  reset: function() { this.init(); },
  play: function() { this.playing = true; },
  pause: function() { this.playing = false; },

  update: function(deltaTime) {
    if (!this.playing || this.mode === 'none') return;

    var speedMult = 0.1 + (this.speed / 100) * 2.9;
    var dt = (deltaTime / 1000) * speedMult;
    this._time += dt;

    var connections = Nodal.Connections.list;

    for (var i = 0; i < this.states.length && i < connections.length; i++) {
      var state = this.states[i];

      switch (this.mode) {
        case 'particle':
          state.t += dt * 0.3;
          if (this.behavior === 'mirror') {
            if (state.t > 2) state.t -= 2;
          } else {
            if (state.t > 1) state.t -= 1;
          }
          break;

        case 'linedraw':
          state.t += dt * 0.3;
          if (state.t > 1.3) state.t = 0;
          break;

        case 'glow':
          break;
      }
    }

    // Update node glow states (stream mode only)
    if (this.mode === 'particle' && this.nodePulse) {
      this._updateNodeGlows(dt, connections);
    } else if (!this.nodePulse) {
      // Fade out any existing glows when pulse disabled
      for (var nid in this._nodeGlows) {
        var g = this._nodeGlows[nid];
        g.target = 0;
        g.intensity *= 0.9;
        if (g.intensity < 0.005) g.intensity = 0;
      }
    }
  },

  // Compute eased head position (0-1) for a given state
  _getHeadT: function(state) {
    var rawT = state.t + state.phase;

    if (this.behavior === 'mirror') {
      rawT = rawT % 2;
      if (rawT < 0) rawT += 2;
      var linear = rawT > 1 ? 2 - rawT : rawT;
      // Sine easing: smooth deceleration at endpoints
      return 0.5 - 0.5 * Math.cos(linear * Math.PI);
    } else {
      // Loop: also ease for natural acceleration/deceleration at nodes
      rawT = rawT % 1;
      if (rawT < 0) rawT += 1;
      return 0.5 - 0.5 * Math.cos(rawT * Math.PI);
    }
  },

  // =========================================================================
  // NODE GLOW — streams light up nodes as they pass
  // =========================================================================
  _updateNodeGlows: function(dt, connections) {
    var nodes = Nodal.Nodes.list;
    var glowRadius = 40;
    var glowRadiusSq = glowRadius * glowRadius;

    // Reset all targets
    for (var nid in this._nodeGlows) {
      this._nodeGlows[nid].target = 0;
    }

    // Check each stream head proximity to each node
    for (var i = 0; i < this.states.length && i < connections.length; i++) {
      var conn = connections[i];
      var pts = conn.pathPoints;
      if (pts.length < 2) continue;

      var headT = this._getHeadT(this.states[i]);
      var headPos = Nodal.Connections.getPointOnPath(pts, headT);

      for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];
        var dx = headPos.x - node.x;
        var dy = headPos.y - node.y;
        var distSq = dx * dx + dy * dy;

        if (distSq < glowRadiusSq) {
          var proximity = 1 - Math.sqrt(distSq) / glowRadius;
          proximity = proximity * proximity;
          if (!this._nodeGlows[node.vertexId]) {
            this._nodeGlows[node.vertexId] = { intensity: 0, target: 0 };
          }
          this._nodeGlows[node.vertexId].target = Math.max(
            this._nodeGlows[node.vertexId].target, proximity
          );
        }
      }
    }

    // Smooth interpolation: fast rise, slow decay
    for (var nid in this._nodeGlows) {
      var g = this._nodeGlows[nid];
      var rate = g.intensity < g.target ? 14 : 2.5;
      g.intensity += (g.target - g.intensity) * Math.min(1, rate * dt);
      if (g.intensity < 0.005) g.intensity = 0;
    }
  },

  // =========================================================================
  // DRAW
  // =========================================================================
  draw: function(p) {
    if (this.mode === 'none') return;

    var connections = Nodal.Connections.list;

    switch (this.mode) {
      case 'particle':
        this._drawStream(p, connections);
        if (this.nodePulse) this._drawNodeGlows(p);
        break;
      case 'linedraw':
        this._drawLineDraw(p, connections);
        break;
      case 'glow':
        this._drawGlow(p, connections);
        break;
    }
  },

  // =========================================================================
  // TRON STREAM — flowing gradient line, no head dot
  // =========================================================================
  _drawStream: function(p, connections) {
    var col = p.color(this.color);
    var cr = p.red(col);
    var cg = p.green(col);
    var cb = p.blue(col);
    var baseWeight = Nodal.Connections.thickness;
    var streamLen = this.streamLength;
    var segments = Math.max(10, this.trailLength);

    for (var i = 0; i < connections.length && i < this.states.length; i++) {
      var conn = connections[i];
      var pts = conn.pathPoints;
      if (pts.length < 2) continue;

      var headT = this._getHeadT(this.states[i]);
      var tailT = Math.max(0, headT - streamLen);

      if (headT <= tailT + 0.001) continue;

      // Draw stream body: gradient segments from tail (dim) to head (bright)
      for (var s = 0; s < segments; s++) {
        var segStart = s / segments;
        var segEnd = (s + 1) / segments;

        var t0 = tailT + segStart * (headT - tailT);
        var t1 = tailT + segEnd * (headT - tailT);

        var pos0 = Nodal.Connections.getPointOnPath(pts, t0);
        var pos1 = Nodal.Connections.getPointOnPath(pts, t1);

        // progress: 0 at tail, 1 at head
        var progress = segEnd;

        // Cubic ramp: gentle at tail, bright at head
        var alpha = progress * progress * progress;

        // Width: thin tail, thicker head
        var weight = baseWeight * (0.3 + progress * 2.0);

        // Glow on the leading edge (last 35%)
        if (progress > 0.65) {
          var glowAmt = (progress - 0.65) / 0.35;
          p.drawingContext.shadowBlur = glowAmt * glowAmt * 20;
          p.drawingContext.shadowColor = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (glowAmt * 0.8).toFixed(2) + ')';
        } else {
          p.drawingContext.shadowBlur = 0;
          p.drawingContext.shadowColor = 'transparent';
        }

        p.stroke(cr, cg, cb, alpha * 255);
        p.strokeWeight(weight);
        p.line(pos0.x, pos0.y, pos1.x, pos1.y);
      }

      // Reset shadow after each connection
      p.drawingContext.shadowBlur = 0;
      p.drawingContext.shadowColor = 'transparent';
    }
  },

  // =========================================================================
  // NODE GLOW RENDERING — pulse effect when stream touches a node
  // =========================================================================
  _drawNodeGlows: function(p) {
    var nodes = Nodal.Nodes.list;
    var col = p.color(this.color);
    var cr = p.red(col);
    var cg = p.green(col);
    var cb = p.blue(col);

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var gs = this._nodeGlows[node.vertexId];
      if (!gs || gs.intensity < 0.01) continue;

      var intensity = gs.intensity;

      // Outer glow ring
      p.drawingContext.shadowBlur = 22 * intensity;
      p.drawingContext.shadowColor = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + intensity.toFixed(2) + ')';

      p.noFill();
      p.stroke(cr, cg, cb, intensity * 130);
      p.strokeWeight(1.5 + intensity * 2);
      var glowSize = node.size * 2.5 + intensity * 10;
      p.ellipse(node.x, node.y, glowSize, glowSize);

      // Soft inner fill
      p.noStroke();
      p.fill(cr, cg, cb, intensity * 45);
      p.ellipse(node.x, node.y, node.size * 1.8, node.size * 1.8);

      // Reset shadow
      p.drawingContext.shadowBlur = 0;
      p.drawingContext.shadowColor = 'transparent';
    }
  },

  // =========================================================================
  // LINE DRAW
  // =========================================================================
  _drawLineDraw: function(p, connections) {
    p.strokeWeight(Nodal.Connections.thickness + 1);
    p.stroke(this.color);
    p.noFill();

    for (var i = 0; i < connections.length && i < this.states.length; i++) {
      var conn = connections[i];
      var state = this.states[i];
      var pts = conn.pathPoints;
      if (pts.length < 2) continue;

      var t = Math.min((state.t + state.phase * 0.3) % 1.3, 1);
      if (t <= 0) continue;

      var totalLen = conn.totalLength;
      var targetDist = t * totalLen;
      var accumulated = 0;

      p.beginShape();
      p.vertex(pts[0].x, pts[0].y);

      for (var j = 0; j < pts.length - 1; j++) {
        var dx = pts[j + 1].x - pts[j].x;
        var dy = pts[j + 1].y - pts[j].y;
        var segLen = Math.sqrt(dx * dx + dy * dy);

        if (accumulated + segLen >= targetDist) {
          var localT = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
          p.vertex(pts[j].x + dx * localT, pts[j].y + dy * localT);
          break;
        } else {
          p.vertex(pts[j + 1].x, pts[j + 1].y);
          accumulated += segLen;
        }
      }
      p.endShape();
    }
  },

  // =========================================================================
  // GLOW / PULSE
  // =========================================================================
  _drawGlow: function(p, connections) {
    var intensity = this.glowIntensity / 100;

    for (var i = 0; i < connections.length; i++) {
      var conn = connections[i];
      var pts = conn.pathPoints;
      if (pts.length < 2) continue;

      var phaseOffset = i * 1.2;
      var glow = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this._time * 3 + phaseOffset));

      var c = p.color(this.color);
      var r = p.red(c);
      var g = p.green(c);
      var b = p.blue(c);

      p.drawingContext.shadowBlur = 20 * glow * intensity;
      p.drawingContext.shadowColor = this.color;

      p.stroke(r, g, b, glow * 255);
      p.strokeWeight((Nodal.Connections.thickness + 1) * (0.8 + glow * 0.4));
      p.noFill();

      p.beginShape();
      for (var j = 0; j < pts.length; j++) {
        p.vertex(pts[j].x, pts[j].y);
      }
      p.endShape();
    }

    // Glow on nodes
    var nodes = Nodal.Nodes.list;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var phaseOffset = i * 0.8 + 2;
      var glow = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this._time * 3 + phaseOffset));

      p.drawingContext.shadowBlur = 15 * glow * intensity;
      p.drawingContext.shadowColor = this.color;

      var c = p.color(Nodal.Nodes.strokeColor);
      p.stroke(p.red(c), p.green(c), p.blue(c), glow * 255);
      p.strokeWeight(Nodal.Nodes.strokeWeight * (0.8 + glow * 0.4));
      p.noFill();
      p.ellipse(node.x, node.y, node.size * 2 * (1 + glow * 0.1), node.size * 2 * (1 + glow * 0.1));
    }

    p.drawingContext.shadowBlur = 0;
    p.drawingContext.shadowColor = 'transparent';
  },

  // Set progress directly (used by export for frame stepping)
  setProgress: function(t) {
    for (var i = 0; i < this.states.length; i++) {
      this.states[i].t = t;
    }
  }
};
