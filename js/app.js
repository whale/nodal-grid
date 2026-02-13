// =============================================================================
// app.js — p5 setup/draw, global state, initialization
// =============================================================================

window.Nodal = window.Nodal || {};

// Global state
Nodal.backgroundColor = '#333333';
Nodal.drawBackground = true;
Nodal.canvasWidth = 1920;
Nodal.canvasHeight = 1080;
Nodal.seed = Math.floor(Math.random() * 99999);

function setup() {
  var container = document.getElementById('canvas-container');
  var cw = container.offsetWidth;
  var ch = container.offsetHeight;
  var canvas = createCanvas(cw, ch);
  canvas.parent('canvas-container');

  // Check for config in URL hash
  var hashConfig = null;
  if (window.location.hash.length > 1) {
    try {
      hashConfig = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
    } catch (e) { /* ignore bad hash */ }
  }

  if (hashConfig) {
    // Load config before first generate
    Nodal.loadConfig(hashConfig);
  } else {
    // Set random seed
    randomSeed(Nodal.seed);

    // Build sidebar UI
    Nodal.UI.init();

    // Generate initial state
    Nodal.Grid.generate(cw, ch, 'isometric', 60);
    Nodal.Nodes.generate(cw, ch);
    Nodal.Connections.generate();
    Nodal.Animation.init();
  }
}

function draw() {
  // Background
  if (Nodal.drawBackground) {
    background(Nodal.backgroundColor);
  } else {
    clear();
  }

  Nodal._drawScene();
}

// Shared scene draw function (used by both draw loop and export)
Nodal._drawScene = function() {
  // Grid
  Nodal.Grid.draw(window);

  // Connections (static paths)
  // Stream mode: dim base paths so bright streams stand out (Tron aesthetic)
  // Line-draw mode: hide entirely (animation replaces them)
  if (Nodal.Animation.mode === 'particle') {
    window.drawingContext.globalAlpha = 0.25;
    Nodal.Connections.draw(window);
    window.drawingContext.globalAlpha = 1.0;
  } else if (Nodal.Animation.mode !== 'linedraw') {
    Nodal.Connections.draw(window);
  }

  // Animation
  Nodal.Animation.update(deltaTime);
  Nodal.Animation.draw(window);

  // Nodes (on top) — can be hidden to see only animations
  if (Nodal.Nodes.visible) {
    Nodal.Nodes.draw(window);
  }
};

// ---- Config save/load ----
Nodal.getConfig = function() {
  return {
    seed: Nodal.seed,
    backgroundColor: Nodal.backgroundColor,
    canvasWidth: Nodal.canvasWidth,
    canvasHeight: Nodal.canvasHeight,
    grid: {
      type: Nodal.Grid.type,
      cellSize: Nodal.Grid.cellSize,
      color: Nodal.Grid.color,
      opacity: Nodal.Grid.opacity,
      shapeChaos: Nodal.Grid.shapeChaos,
      shapeDirection: Nodal.Grid.shapeDirection,
      shapeElongation: Nodal.Grid.shapeElongation,
      shapeSpread: Nodal.Grid.shapeSpread
    },
    nodes: {
      count: Nodal.Nodes.count,
      visible: Nodal.Nodes.visible,
      axisAngle: Nodal.Nodes.axisAngle,
      chaos: Nodal.Nodes.chaos,
      style: Nodal.Nodes.style,
      size: Nodal.Nodes.size,
      fillColor: Nodal.Nodes.fillColor,
      strokeColor: Nodal.Nodes.strokeColor,
      strokeWeight: Nodal.Nodes.strokeWeight
    },
    connections: {
      count: Nodal.Connections.count,
      color: Nodal.Connections.color,
      thickness: Nodal.Connections.thickness,
      style: Nodal.Connections.style,
      dashLength: Nodal.Connections.dashLength,
      dashGap: Nodal.Connections.dashGap
    },
    animation: {
      mode: Nodal.Animation.mode,
      speed: Nodal.Animation.speed,
      color: Nodal.Animation.color,
      behavior: Nodal.Animation.behavior,
      nodePulse: Nodal.Animation.nodePulse,
      streamLength: Nodal.Animation.streamLength,
      trailLength: Nodal.Animation.trailLength,
      particleSize: Nodal.Animation.particleSize,
      glowIntensity: Nodal.Animation.glowIntensity
    }
  };
};

Nodal.loadConfig = function(cfg) {
  if (!cfg) return false;

  if (cfg.seed != null) Nodal.seed = cfg.seed;
  if (cfg.backgroundColor) Nodal.backgroundColor = cfg.backgroundColor;
  if (cfg.canvasWidth) Nodal.canvasWidth = cfg.canvasWidth;
  if (cfg.canvasHeight) Nodal.canvasHeight = cfg.canvasHeight;

  var g = cfg.grid || {};
  if (g.type) Nodal.Grid.type = g.type;
  if (g.cellSize) Nodal.Grid.cellSize = g.cellSize;
  if (g.color) Nodal.Grid.color = g.color;
  if (g.opacity != null) Nodal.Grid.opacity = g.opacity;
  if (g.shapeChaos != null) Nodal.Grid.shapeChaos = g.shapeChaos;
  if (g.shapeDirection != null) Nodal.Grid.shapeDirection = g.shapeDirection;
  if (g.shapeElongation != null) Nodal.Grid.shapeElongation = g.shapeElongation;
  if (g.shapeSpread != null) Nodal.Grid.shapeSpread = g.shapeSpread;

  var n = cfg.nodes || {};
  if (n.count) Nodal.Nodes.count = n.count;
  if (n.visible != null) Nodal.Nodes.visible = n.visible;
  if (n.axisAngle != null) Nodal.Nodes.axisAngle = n.axisAngle;
  if (n.chaos != null) Nodal.Nodes.chaos = n.chaos;
  if (n.style) Nodal.Nodes.style = n.style;
  if (n.size) Nodal.Nodes.size = n.size;
  if (n.fillColor) Nodal.Nodes.fillColor = n.fillColor;
  if (n.strokeColor) Nodal.Nodes.strokeColor = n.strokeColor;
  if (n.strokeWeight) Nodal.Nodes.strokeWeight = n.strokeWeight;

  var c = cfg.connections || {};
  if (c.count != null) Nodal.Connections.count = c.count;
  if (c.color) Nodal.Connections.color = c.color;
  if (c.thickness) Nodal.Connections.thickness = c.thickness;
  if (c.style) Nodal.Connections.style = c.style;
  if (c.dashLength) Nodal.Connections.dashLength = c.dashLength;
  if (c.dashGap) Nodal.Connections.dashGap = c.dashGap;

  var a = cfg.animation || {};
  if (a.mode) Nodal.Animation.mode = a.mode;
  if (a.speed != null) Nodal.Animation.speed = a.speed;
  if (a.color) Nodal.Animation.color = a.color;
  if (a.behavior) Nodal.Animation.behavior = a.behavior;
  if (a.nodePulse != null) Nodal.Animation.nodePulse = a.nodePulse;
  if (a.streamLength != null) Nodal.Animation.streamLength = a.streamLength;
  if (a.trailLength != null) Nodal.Animation.trailLength = a.trailLength;
  if (a.particleSize != null) Nodal.Animation.particleSize = a.particleSize;
  if (a.glowIntensity != null) Nodal.Animation.glowIntensity = a.glowIntensity;

  // Re-seed and regenerate
  randomSeed(Nodal.seed);
  Nodal.Grid.generate(width, height, Nodal.Grid.type, Nodal.Grid.cellSize);
  Nodal.Nodes.generate(width, height);
  Nodal.Connections.generate();
  Nodal.Animation.init();
  Nodal.UI.init();

  return true;
};

function windowResized() {
  var container = document.getElementById('canvas-container');
  var cw = container.offsetWidth;
  var ch = container.offsetHeight;
  resizeCanvas(cw, ch);

  // Regenerate for new dimensions
  Nodal.Grid.generate(cw, ch, Nodal.Grid.type, Nodal.Grid.cellSize);
  Nodal.Nodes.generate(cw, ch);
  Nodal.Connections.generate();
  Nodal.Animation.init();
}
