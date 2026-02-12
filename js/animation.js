// =============================================================================
// animation.js — Animation modes: particle travel, line draw, glow/pulse
// =============================================================================

window.Nodal = window.Nodal || {};

Nodal.Animation = {
  mode: 'particle',     // 'particle' | 'linedraw' | 'glow' | 'none'
  speed: 50,            // 0-100
  playing: true,
  color: '#c8ff00',
  particleSize: 5,
  trailLength: 5,
  glowIntensity: 50,    // 0-100

  // Per-connection state
  states: [],
  _time: 0,

  init: function() {
    this.states = [];
    this._time = 0;
    var connections = Nodal.Connections.list;

    for (var i = 0; i < connections.length; i++) {
      this.states.push({
        t: 0,
        phase: i * 0.3,          // Stagger
        direction: 1,
        trail: []
      });
    }
  },

  reset: function() {
    this.init();
  },

  play: function() { this.playing = true; },
  pause: function() { this.playing = false; },

  update: function(deltaTime) {
    if (!this.playing || this.mode === 'none') return;

    // Speed maps 0-100 to 0.1-3.0 multiplier
    var speedMult = 0.1 + (this.speed / 100) * 2.9;
    var dt = (deltaTime / 1000) * speedMult;
    this._time += dt;

    var connections = Nodal.Connections.list;

    for (var i = 0; i < this.states.length && i < connections.length; i++) {
      var state = this.states[i];

      switch (this.mode) {
        case 'particle':
          // t goes 0 to 1, then loops
          state.t += dt * 0.4;
          if (state.t > 1) state.t -= 1;
          break;

        case 'linedraw':
          // Draw from 0 to 1, hold briefly, then reset
          state.t += dt * 0.3;
          if (state.t > 1.3) state.t = 0; // 0.3s hold at end
          break;

        case 'glow':
          // Continuous sine wave — time is enough
          break;
      }
    }
  },

  draw: function(p) {
    if (this.mode === 'none') return;

    var connections = Nodal.Connections.list;

    switch (this.mode) {
      case 'particle':
        this._drawParticle(p, connections);
        break;
      case 'linedraw':
        this._drawLineDraw(p, connections);
        break;
      case 'glow':
        this._drawGlow(p, connections);
        break;
    }
  },

  // ---- Particle Travel ----
  _drawParticle: function(p, connections) {
    for (var i = 0; i < connections.length && i < this.states.length; i++) {
      var conn = connections[i];
      var state = this.states[i];
      var pts = conn.pathPoints;
      if (pts.length < 2) continue;

      // Current position
      var t = (state.t + state.phase) % 1;
      var pos = Nodal.Connections.getPointOnPath(pts, t);

      // Trail
      if (this.trailLength > 0) {
        for (var tr = this.trailLength; tr >= 1; tr--) {
          var trailT = (t - tr * 0.02 + 1) % 1;
          var trailPos = Nodal.Connections.getPointOnPath(pts, trailT);
          var alpha = (1 - tr / (this.trailLength + 1)) * 180;
          var c = p.color(this.color);
          p.noStroke();
          p.fill(p.red(c), p.green(c), p.blue(c), alpha);
          var trailSize = this.particleSize * (1 - tr / (this.trailLength + 1)) * 0.8;
          p.ellipse(trailPos.x, trailPos.y, trailSize * 2, trailSize * 2);
        }
      }

      // Main particle
      p.noStroke();
      p.fill(this.color);
      p.ellipse(pos.x, pos.y, this.particleSize * 2, this.particleSize * 2);
    }
  },

  // ---- Line Drawing ----
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

      // Draw the path up to point at t
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
          // Partial segment
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

  // ---- Glow/Pulse ----
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

      // Glow shadow
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

    // Reset shadow
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
