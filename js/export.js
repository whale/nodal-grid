// =============================================================================
// export.js — PNG, GIF, WebM export
// =============================================================================

window.Nodal = window.Nodal || {};

Nodal.Export = {
  duration: 3,          // seconds for GIF/WebM
  fps: 30,
  exporting: false,

  // ---- PNG with background ----
  exportPNG: function() {
    saveCanvas('nodal-grid', 'png');
  },

  // ---- PNG transparent (no background) ----
  exportPNGTransparent: function() {
    Nodal.drawBackground = false;
    clear();
    Nodal._drawScene();
    // Save using canvas directly for reliable transparency
    var canvas = document.querySelector('#canvas-container canvas');
    canvas.toBlob(function(blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'nodal-grid-transparent.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Nodal.drawBackground = true;
    }, 'image/png');
  },

  // ---- GIF export ----
  exportGIF: function() {
    if (this.exporting) return;
    this.exporting = true;

    var self = this;
    var totalFrames = Math.round(this.duration * this.fps);
    var frameDelay = Math.round(1000 / this.fps);

    // Show progress
    var overlay = this._showProgress('Exporting GIF...');

    var gif = new GIF({
      workers: 2,
      quality: 10,
      width: width,
      height: height,
      workerScript: 'lib/gif.worker.js'
    });

    // Pause animation and save state
    var wasPlaying = Nodal.Animation.playing;
    Nodal.Animation.pause();
    var savedStates = JSON.parse(JSON.stringify(Nodal.Animation.states));
    var savedTime = Nodal.Animation._time;

    // Capture frames
    for (var i = 0; i < totalFrames; i++) {
      // Set animation to this frame's time
      Nodal.Animation._time = (i / totalFrames) * self.duration;
      for (var s = 0; s < Nodal.Animation.states.length; s++) {
        Nodal.Animation.states[s].t = i / totalFrames;
      }

      // Render frame
      clear();
      if (Nodal.drawBackground) {
        background(Nodal.backgroundColor);
      }
      Nodal._drawScene();

      // Add to GIF
      var canvas = document.querySelector('#canvas-container canvas');
      gif.addFrame(canvas, { copy: true, delay: frameDelay });

      // Update progress
      self._updateProgress(overlay, (i + 1) / totalFrames);
    }

    gif.on('finished', function(blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'nodal-grid.gif';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Restore state
      Nodal.Animation.states = savedStates;
      Nodal.Animation._time = savedTime;
      if (wasPlaying) Nodal.Animation.play();
      self.exporting = false;
      self._hideProgress(overlay);
    });

    gif.on('progress', function(p) {
      self._updateProgress(overlay, 0.5 + p * 0.5, 'Encoding GIF...');
    });

    gif.render();
  },

  // ---- WebM export ----
  exportWebM: function() {
    if (this.exporting) return;
    this.exporting = true;

    var self = this;
    var overlay = this._showProgress('Recording WebM...');

    var canvas = document.querySelector('#canvas-container canvas');
    var stream = canvas.captureStream(this.fps);

    var mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    var recorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: 5000000
    });

    var chunks = [];
    recorder.ondataavailable = function(e) {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = function() {
      var blob = new Blob(chunks, { type: 'video/webm' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'nodal-grid.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      self.exporting = false;
      self._hideProgress(overlay);
    };

    recorder.start();

    // Progress updates
    var elapsed = 0;
    var interval = setInterval(function() {
      elapsed += 100;
      self._updateProgress(overlay, elapsed / (self.duration * 1000));
      if (elapsed >= self.duration * 1000) {
        clearInterval(interval);
      }
    }, 100);

    setTimeout(function() {
      recorder.stop();
    }, self.duration * 1000);
  },

  // ---- Progress UI helpers ----
  _showProgress: function(message) {
    var overlay = document.createElement('div');
    overlay.className = 'export-progress';
    overlay.innerHTML =
      '<div class="export-progress-inner">' +
        '<div class="export-progress-message">' + message + '</div>' +
        '<div class="export-progress-bar">' +
          '<div class="export-progress-fill" style="width: 0%"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  },

  _updateProgress: function(overlay, fraction, message) {
    if (!overlay) return;
    var fill = overlay.querySelector('.export-progress-fill');
    if (fill) fill.style.width = Math.round(fraction * 100) + '%';
    if (message) {
      var msg = overlay.querySelector('.export-progress-message');
      if (msg) msg.textContent = message;
    }
  },

  _hideProgress: function(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }
};
