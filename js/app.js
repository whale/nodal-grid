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
  Nodal.Connections.draw(window);

  // Animation
  Nodal.Animation.update(deltaTime);
  Nodal.Animation.draw(window);

  // Nodes (on top)
  Nodal.Nodes.draw(window);
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
