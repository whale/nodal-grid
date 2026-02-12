// =============================================================================
// ui.js — Sidebar construction, control bindings, axis dial
// =============================================================================

window.Nodal = window.Nodal || {};

Nodal.UI = {
  _sidebar: null,

  init: function() {
    this._sidebar = document.getElementById('sidebar');
    this._sidebar.innerHTML = '';

    this._buildGridSection();
    this._buildNodesSection();
    this._buildConnectionsSection();
    this._buildAnimationSection();
    this._buildExportSection();
    this._buildAdvancedDrawer();
  },

  // ---- Helpers ----
  _addSection: function(title) {
    var h = document.createElement('div');
    h.className = 'section-header';
    h.textContent = title;
    this._sidebar.appendChild(h);
    return h;
  },

  _addControl: function(label, inputEl, container) {
    var row = document.createElement('div');
    row.className = 'control-row';

    var lbl = document.createElement('label');
    lbl.textContent = label;
    row.appendChild(lbl);

    var right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '6px';
    right.appendChild(inputEl);
    row.appendChild(right);

    (container || this._sidebar).appendChild(row);
    return { row: row, right: right };
  },

  _addSlider: function(label, min, max, value, step, onChange, container) {
    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.value = value;
    slider.step = step || 1;

    var display = document.createElement('span');
    display.className = 'value-display';
    display.textContent = value;

    slider.addEventListener('input', function() {
      display.textContent = slider.value;
      onChange(parseFloat(slider.value));
    });

    var ctrl = this._addControl(label, slider, container);
    ctrl.right.appendChild(display);
    return slider;
  },

  _addColor: function(label, value, onChange, container) {
    var input = document.createElement('input');
    input.type = 'color';
    input.value = value;
    input.addEventListener('input', function() {
      onChange(input.value);
    });
    this._addControl(label, input, container);
    return input;
  },

  _addSelect: function(label, options, value, onChange, container) {
    var sel = document.createElement('select');
    for (var i = 0; i < options.length; i++) {
      var opt = document.createElement('option');
      opt.value = options[i].value;
      opt.textContent = options[i].label;
      if (options[i].value === value) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', function() {
      onChange(sel.value);
    });
    this._addControl(label, sel, container);
    return sel;
  },

  _addButton: function(label, className, onClick, container) {
    var btn = document.createElement('button');
    btn.className = 'btn ' + (className || '');
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    (container || this._sidebar).appendChild(btn);
    return btn;
  },

  _addToggle: function(label, labels, activeIndex, onChange, container) {
    var toggleDiv = document.createElement('div');
    toggleDiv.className = 'toggle-group';
    var buttons = [];

    for (var i = 0; i < labels.length; i++) {
      (function(idx) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-small' + (idx === activeIndex ? ' active' : '');
        btn.textContent = labels[idx];
        btn.addEventListener('click', function() {
          for (var b = 0; b < buttons.length; b++) buttons[b].classList.remove('active');
          btn.classList.add('active');
          onChange(idx);
        });
        buttons.push(btn);
        toggleDiv.appendChild(btn);
      })(i);
    }

    this._addControl(label, toggleDiv, container);
    return toggleDiv;
  },

  _regenerateAll: function() {
    Nodal.Grid.generate(width, height, Nodal.Grid.type, Nodal.Grid.cellSize);
    Nodal.Nodes.generate(width, height);
    Nodal.Connections.generate();
    Nodal.Animation.init();
  },

  _regenerateNodes: function() {
    Nodal.Nodes.generate(width, height);
    Nodal.Connections.generate();
    Nodal.Animation.init();
  },

  _regenerateConnections: function() {
    Nodal.Connections.generate();
    Nodal.Animation.init();
  },

  // ==== GRID SECTION ====
  _buildGridSection: function() {
    this._addSection('Grid');

    var self = this;

    this._addSelect('Type', [
      { value: 'isometric', label: 'Isometric (Hex)' },
      { value: 'triangular', label: 'Triangular' },
      { value: 'square', label: 'Square' }
    ], Nodal.Grid.type, function(val) {
      Nodal.Grid.type = val;
      self._regenerateAll();
    });

    this._addSlider('Cell Size', 20, 150, Nodal.Grid.cellSize, 5, function(val) {
      Nodal.Grid.cellSize = val;
      self._regenerateAll();
    });

    this._addColor('Color', Nodal.Grid.color, function(val) {
      Nodal.Grid.color = val;
    });

    this._addSlider('Opacity', 0, 100, Math.round(Nodal.Grid.opacity * 100), 1, function(val) {
      Nodal.Grid.opacity = val / 100;
    });

    this._addSlider('Shape Chaos', 0, 100, Nodal.Grid.shapeChaos, 5, function(val) {
      Nodal.Grid.shapeChaos = val;
      self._regenerateAll();
    });

    this._addSlider('Shape Dir', 0, 360, Nodal.Grid.shapeDirection, 5, function(val) {
      Nodal.Grid.shapeDirection = val;
      self._regenerateAll();
    });

    this._addSlider('Elongation', 0, 100, Nodal.Grid.shapeElongation, 5, function(val) {
      Nodal.Grid.shapeElongation = val;
      self._regenerateAll();
    });

    this._addSlider('Spread', 0, 100, Nodal.Grid.shapeSpread, 5, function(val) {
      Nodal.Grid.shapeSpread = val;
      self._regenerateAll();
    });
  },

  // ==== NODES SECTION ====
  _buildNodesSection: function() {
    this._addSection('Nodes');

    var self = this;

    this._addToggle('Show', ['On', 'Off'],
      Nodal.Nodes.visible ? 0 : 1,
      function(idx) { Nodal.Nodes.visible = idx === 0; }
    );

    this._addSlider('Count', 2, 30, Nodal.Nodes.count, 1, function(val) {
      Nodal.Nodes.count = val;
      self._regenerateNodes();
    });

    // Style toggle
    var toggleDiv = document.createElement('div');
    toggleDiv.className = 'toggle-group';

    var btnCircle = document.createElement('button');
    btnCircle.className = 'btn btn-small' + (Nodal.Nodes.style === 'circle' ? ' active' : '');
    btnCircle.textContent = 'Circle';

    var btnSquare = document.createElement('button');
    btnSquare.className = 'btn btn-small' + (Nodal.Nodes.style === 'square' ? ' active' : '');
    btnSquare.textContent = 'Square';

    btnCircle.addEventListener('click', function() {
      Nodal.Nodes.style = 'circle';
      btnCircle.classList.add('active');
      btnSquare.classList.remove('active');
    });

    btnSquare.addEventListener('click', function() {
      Nodal.Nodes.style = 'square';
      btnSquare.classList.add('active');
      btnCircle.classList.remove('active');
    });

    toggleDiv.appendChild(btnCircle);
    toggleDiv.appendChild(btnSquare);
    this._addControl('Style', toggleDiv);

    this._addColor('Color', Nodal.Nodes.fillColor, function(val) {
      Nodal.Nodes.fillColor = val;
      Nodal.Nodes.strokeColor = val;
    });

    this._addSlider('Size', 4, 30, Nodal.Nodes.size, 1, function(val) {
      Nodal.Nodes.size = val;
      // Update existing nodes
      for (var i = 0; i < Nodal.Nodes.list.length; i++) {
        Nodal.Nodes.list[i].size = val;
      }
    });

    // Axis dial + slider
    this._buildAxisControl();

    this._addSlider('Chaos', 0, 100, Nodal.Nodes.chaos, 1, function(val) {
      Nodal.Nodes.chaos = val;
    });

    // Regenerate button
    var btnRow = document.createElement('div');
    btnRow.style.marginBottom = '10px';
    this._sidebar.appendChild(btnRow);
    this._addButton('Regenerate', 'btn-primary', function() {
      self._regenerateNodes();
    }, btnRow);
  },

  // Axis angle control with visual dial
  _buildAxisControl: function() {
    var self = this;
    var row = document.createElement('div');
    row.className = 'control-row';

    var lbl = document.createElement('label');
    lbl.textContent = 'Axis';
    row.appendChild(lbl);

    var container = document.createElement('div');
    container.className = 'axis-dial-container';

    // Mini canvas dial
    var dialCanvas = document.createElement('canvas');
    dialCanvas.className = 'axis-dial';
    dialCanvas.width = 60;
    dialCanvas.height = 60;
    container.appendChild(dialCanvas);

    // Slider
    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 360;
    slider.value = Nodal.Nodes.axisAngle;
    slider.step = 1;
    slider.style.maxWidth = '80px';
    container.appendChild(slider);

    var display = document.createElement('span');
    display.className = 'value-display';
    display.textContent = Nodal.Nodes.axisAngle + '\u00B0';
    container.appendChild(display);

    row.appendChild(container);
    this._sidebar.appendChild(row);

    var drawDial = function() {
      var ctx = dialCanvas.getContext('2d');
      var w = dialCanvas.width;
      var h = dialCanvas.height;
      var cx = w / 2;
      var cy = h / 2;
      var r = 24;

      ctx.clearRect(0, 0, w, h);

      // Circle outline
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Axis line
      var angle = Nodal.Nodes.axisAngle * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = '#c8ff00';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Endpoint dot
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#c8ff00';
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#888';
      ctx.fill();
    };

    slider.addEventListener('input', function() {
      Nodal.Nodes.axisAngle = parseInt(slider.value);
      display.textContent = slider.value + '\u00B0';
      drawDial();
    });

    // Dial drag interaction
    var dragging = false;
    dialCanvas.addEventListener('mousedown', function(e) { dragging = true; updateAngleFromMouse(e); });
    window.addEventListener('mousemove', function(e) { if (dragging) updateAngleFromMouse(e); });
    window.addEventListener('mouseup', function() { dragging = false; });

    function updateAngleFromMouse(e) {
      var rect = dialCanvas.getBoundingClientRect();
      var mx = e.clientX - rect.left - 30;
      var my = e.clientY - rect.top - 30;
      var angle = Math.atan2(my, mx) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      angle = Math.round(angle);
      Nodal.Nodes.axisAngle = angle;
      slider.value = angle;
      display.textContent = angle + '\u00B0';
      drawDial();
    }

    // Initial draw
    setTimeout(drawDial, 50);
  },

  // ==== CONNECTIONS SECTION ====
  _buildConnectionsSection: function() {
    this._addSection('Connections');

    var self = this;

    this._addSlider('Count', 0, 30, Nodal.Connections.count, 1, function(val) {
      Nodal.Connections.count = val;
      self._regenerateConnections();
    });

    this._addColor('Color', Nodal.Connections.color, function(val) {
      Nodal.Connections.color = val;
    });

    this._addSlider('Thickness', 1, 8, Nodal.Connections.thickness, 0.5, function(val) {
      Nodal.Connections.thickness = val;
    });

    // Style toggle
    var toggleDiv = document.createElement('div');
    toggleDiv.className = 'toggle-group';

    var btnSolid = document.createElement('button');
    btnSolid.className = 'btn btn-small' + (Nodal.Connections.style === 'solid' ? ' active' : '');
    btnSolid.textContent = 'Solid';

    var btnDashed = document.createElement('button');
    btnDashed.className = 'btn btn-small' + (Nodal.Connections.style === 'dashed' ? ' active' : '');
    btnDashed.textContent = 'Dashed';

    btnSolid.addEventListener('click', function() {
      Nodal.Connections.style = 'solid';
      btnSolid.classList.add('active');
      btnDashed.classList.remove('active');
    });

    btnDashed.addEventListener('click', function() {
      Nodal.Connections.style = 'dashed';
      btnDashed.classList.add('active');
      btnSolid.classList.remove('active');
    });

    toggleDiv.appendChild(btnSolid);
    toggleDiv.appendChild(btnDashed);
    this._addControl('Style', toggleDiv);
  },

  // ==== ANIMATION SECTION ====
  _buildAnimationSection: function() {
    this._addSection('Animation');

    this._addSelect('Mode', [
      { value: 'particle', label: 'Stream' },
      { value: 'linedraw', label: 'Line Draw' },
      { value: 'glow', label: 'Glow / Pulse' },
      { value: 'none', label: 'None' }
    ], Nodal.Animation.mode, function(val) {
      Nodal.Animation.mode = val;
    });

    this._addToggle('Behavior', ['Mirror', 'Loop'],
      Nodal.Animation.behavior === 'mirror' ? 0 : 1,
      function(idx) {
        Nodal.Animation.behavior = idx === 0 ? 'mirror' : 'loop';
      }
    );

    this._addSlider('Speed', 0, 100, Nodal.Animation.speed, 1, function(val) {
      Nodal.Animation.speed = val;
    });

    // Play/Pause
    var playBtn = document.createElement('button');
    playBtn.className = 'btn btn-play';
    playBtn.textContent = Nodal.Animation.playing ? '\u275A\u275A' : '\u25B6';
    playBtn.addEventListener('click', function() {
      if (Nodal.Animation.playing) {
        Nodal.Animation.pause();
        playBtn.textContent = '\u25B6';
      } else {
        Nodal.Animation.play();
        playBtn.textContent = '\u275A\u275A';
      }
    });
    this._addControl('Play', playBtn);

    this._addColor('Color', Nodal.Animation.color, function(val) {
      Nodal.Animation.color = val;
    });

    this._addToggle('Node Pulse', ['On', 'Off'],
      Nodal.Animation.nodePulse ? 0 : 1,
      function(idx) { Nodal.Animation.nodePulse = idx === 0; }
    );
  },

  // ==== EXPORT SECTION ====
  _buildExportSection: function() {
    this._addSection('Export');

    this._addSlider('Duration', 1, 10, Nodal.Export.duration, 0.5, function(val) {
      Nodal.Export.duration = val;
    });

    var row = document.createElement('div');
    row.className = 'export-row';

    this._addButton('PNG', 'btn-primary btn-small', function() {
      Nodal.Export.exportPNG();
    }, row);

    this._addButton('PNG (clear)', 'btn-small', function() {
      Nodal.Export.exportPNGTransparent();
    }, row);

    this._addButton('GIF', 'btn-small', function() {
      Nodal.Export.exportGIF();
    }, row);

    this._addButton('WebM', 'btn-small', function() {
      Nodal.Export.exportWebM();
    }, row);

    this._sidebar.appendChild(row);
  },

  // ==== ADVANCED DRAWER ====
  _buildAdvancedDrawer: function() {
    var details = document.createElement('details');
    details.className = 'advanced-drawer';

    var summary = document.createElement('summary');
    summary.textContent = 'Advanced';
    details.appendChild(summary);

    var content = document.createElement('div');
    content.style.paddingTop = '8px';
    details.appendChild(content);

    var self = this;

    // Background color
    this._addColor('Background', Nodal.backgroundColor, function(val) {
      Nodal.backgroundColor = val;
    }, content);

    // Canvas dimensions
    this._addSlider('Export Width', 640, 3840, Nodal.canvasWidth, 10, function(val) {
      Nodal.canvasWidth = val;
    }, content);

    this._addSlider('Export Height', 480, 2160, Nodal.canvasHeight, 10, function(val) {
      Nodal.canvasHeight = val;
    }, content);

    // Node stroke
    this._addSlider('Node Stroke', 1, 6, Nodal.Nodes.strokeWeight, 0.5, function(val) {
      Nodal.Nodes.strokeWeight = val;
    }, content);

    // Dash params
    this._addSlider('Dash Length', 4, 20, Nodal.Connections.dashLength, 1, function(val) {
      Nodal.Connections.dashLength = val;
    }, content);

    this._addSlider('Dash Gap', 2, 15, Nodal.Connections.dashGap, 1, function(val) {
      Nodal.Connections.dashGap = val;
    }, content);

    // Stream settings
    this._addSlider('Head Size', 2, 15, Nodal.Animation.particleSize, 1, function(val) {
      Nodal.Animation.particleSize = val;
    }, content);

    this._addSlider('Stream Len', 5, 50, Nodal.Animation.streamLength * 100, 1, function(val) {
      Nodal.Animation.streamLength = val / 100;
    }, content);

    this._addSlider('Smoothness', 5, 30, Nodal.Animation.trailLength, 1, function(val) {
      Nodal.Animation.trailLength = val;
    }, content);

    this._addSlider('Glow Intensity', 0, 100, Nodal.Animation.glowIntensity, 1, function(val) {
      Nodal.Animation.glowIntensity = val;
    }, content);

    // Seed
    var seedRow = document.createElement('div');
    seedRow.className = 'control-row';
    var seedLabel = document.createElement('label');
    seedLabel.textContent = 'Seed';
    seedRow.appendChild(seedLabel);

    var seedRight = document.createElement('div');
    seedRight.style.display = 'flex';
    seedRight.style.alignItems = 'center';
    seedRight.style.gap = '6px';

    var seedInput = document.createElement('input');
    seedInput.type = 'number';
    seedInput.value = Nodal.seed;
    seedInput.addEventListener('change', function() {
      Nodal.seed = parseInt(seedInput.value) || 0;
      randomSeed(Nodal.seed);
      self._regenerateAll();
    });
    seedRight.appendChild(seedInput);

    var seedBtn = document.createElement('button');
    seedBtn.className = 'btn btn-small';
    seedBtn.textContent = 'Random';
    seedBtn.addEventListener('click', function() {
      Nodal.seed = Math.floor(Math.random() * 99999);
      seedInput.value = Nodal.seed;
      randomSeed(Nodal.seed);
      self._regenerateAll();
    });
    seedRight.appendChild(seedBtn);

    seedRow.appendChild(seedRight);
    content.appendChild(seedRow);

    this._sidebar.appendChild(details);
  }
};
