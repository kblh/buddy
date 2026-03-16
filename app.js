'use strict';

(function () {

  // ─── CONSTANTS ──────────────────────────────────────────────────────────────

  const INSTRUMENTS = ['kick', 'snare', 'hihat'];
  const STORAGE_KEYS = {
    CURRENT:  'rc_current',
    SETTINGS: 'rc_settings',
    RHYTHMS:  'rc_rhythms',
  };
  const MAX_RHYTHMS = 50;
  const LOOKAHEAD_TIME = 0.1;   // seconds
  const SCHEDULE_INTERVAL = 25; // ms

  // PRESETS – defined in Chunk 2
  const PRESETS = [
    {
      name: 'Metronome', bpm: 120,
      kick:  { subdivisions: 16, rotation: 0, beats: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
      snare: { subdivisions: 16, rotation: 0, beats: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
      hihat: { subdivisions: 16, rotation: 0, beats: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] },
    },
    {
      name: 'Basic Rock', bpm: 120,
      kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0] },
      snare: { subdivisions: 16, rotation: 0, beats: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] },
      hihat: { subdivisions: 16, rotation: 0, beats: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
    },
    {
      name: 'Bossa Nova', bpm: 120,
      kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0] },
      snare: { subdivisions: 16, rotation: 0, beats: [0,0,1,0,0,0,1,0,0,0,0,1,0,0,1,0] },
      hihat: { subdivisions: 16, rotation: 0, beats: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
    },
    {
      name: 'Tresillo', bpm: 120,
      kick:  { subdivisions: 8, rotation: 0, beats: [1,0,0,1,0,0,1,0] },
      snare: { subdivisions: 8, rotation: 0, beats: [0,0,0,0,1,0,0,0] },
      hihat: { subdivisions: 8, rotation: 0, beats: [1,1,1,1,1,1,1,1] },
    },
    {
      name: 'Son Clave', bpm: 120,
      kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0] },
      snare: { subdivisions: 16, rotation: 0, beats: [0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0] },
      hihat: { subdivisions: 16, rotation: 0, beats: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
    },
    {
      name: 'Rumba Clave', bpm: 100,
      kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,1,0,0,0,1,0,0,1,0,1,0,0,0] },
      snare: { subdivisions: 16, rotation: 0, beats: [0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0] },
      hihat: { subdivisions: 16, rotation: 0, beats: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
    },
    {
      name: 'Shiko', bpm: 120,
      kick:  { subdivisions: 8, rotation: 0, beats: [1,0,0,0,1,0,0,0] },
      snare: { subdivisions: 8, rotation: 0, beats: [0,0,1,0,0,0,1,0] },
      hihat: { subdivisions: 8, rotation: 0, beats: [1,0,0,1,0,0,1,0] },
    },
    {
      name: 'Bembé', bpm: 120,
      kick:  { subdivisions: 12, rotation: 0, beats: [1,0,1,0,1,0,0,1,0,1,0,0] },
      snare: { subdivisions: 12, rotation: 0, beats: [0,0,0,1,0,0,1,0,0,0,1,0] },
      hihat: { subdivisions: 12, rotation: 0, beats: [1,1,0,1,1,0,1,1,0,1,1,0] },
    },
    {
      name: 'Samba', bpm: 140,
      kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0] },
      snare: { subdivisions: 16, rotation: 0, beats: [0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,0] },
      hihat: { subdivisions: 16, rotation: 0, beats: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
    },
    {
      name: 'Gahu', bpm: 120,
      kick:  { subdivisions: 8, rotation: 0, beats: [1,0,0,1,0,0,1,0] },
      snare: { subdivisions: 8, rotation: 0, beats: [0,1,0,0,1,0,0,1] },
      hihat: { subdivisions: 8, rotation: 0, beats: [1,0,1,0,1,0,1,0] },
    },
    {
      name: 'Soukous', bpm: 130,
      kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] },
      snare: { subdivisions: 16, rotation: 0, beats: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0] },
      hihat: { subdivisions: 16, rotation: 0, beats: [1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,0] },
    },
    {
      name: 'Steve Reich', bpm: 132,
      kick:  { subdivisions: 12, rotation: 0, beats: [1,0,0,1,0,0,1,0,0,1,0,0] },
      snare: { subdivisions: 12, rotation: 1, beats: [1,0,0,1,0,0,1,0,0,1,0,0] },
      hihat: { subdivisions: 12, rotation: 2, beats: [1,0,0,1,0,0,1,0,0,1,0,0] },
    },
    {
      name: 'Fume-fume', bpm: 115,
      kick:  { subdivisions: 10, rotation: 0, beats: [1,0,1,0,0,1,0,1,0,0] },
      snare: { subdivisions: 10, rotation: 0, beats: [0,0,0,1,0,0,0,0,1,0] },
      hihat: { subdivisions: 10, rotation: 0, beats: [1,1,1,1,1,1,1,1,1,1] },
    },
  ];

  // ─── STATE ──────────────────────────────────────────────────────────────────

  const State = {
    bpm: 120,
    isPlaying: false,
    kick:  _makeInstrument(),
    snare: _makeInstrument(),
    hihat: _makeInstrument(),
    masterVolume: 0.8,
  };

  function _makeInstrument() {
    return {
      subdivisions: 16,
      rotation: 0,
      beats: Array(16).fill(false),
      flashFlags: Array(16).fill(false),
      soundIndex: 0,
      volume: 0.8,
    };
  }

  /**
   * Preserve beat ratio when changing subdivision count.
   * Maps active old beats forward into the new grid.
   * Pure function — does not mutate State.
   */
  function remapBeats(oldBeats, oldSubs, newSubs) {
    const newBeats = Array(newSubs).fill(false);
    oldBeats.forEach((active, i) => {
      if (active) {
        const newIdx = Math.round(i * newSubs / oldSubs) % newSubs;
        newBeats[newIdx] = true;
      }
    });
    return newBeats;
  }

  function setSubdivisions(instName, newSubs) {
    newSubs = Math.max(2, Math.min(32, newSubs));
    const inst = State[instName];
    inst.beats = remapBeats(inst.beats, inst.subdivisions, newSubs);
    inst.flashFlags = Array(newSubs).fill(false);
    inst.rotation = Math.min(inst.rotation, newSubs - 1);
    inst.subdivisions = newSubs;
  }

  function setRotation(instName, delta) {
    const inst = State[instName];
    inst.rotation = (inst.rotation + delta + inst.subdivisions) % inst.subdivisions;
  }

  function toggleBeat(instName, stepIndex) {
    State[instName].beats[stepIndex] = !State[instName].beats[stepIndex];
  }

  function setBpm(bpm) {
    State.bpm = Math.max(20, Math.min(300, Math.round(bpm)));
  }

  // ─── AUDIO ENGINE ───────────────────────────────────────────────────────────
  const AudioEngine = {
    ctx: null,
    masterGain: null,
    instrumentGains: { kick: null, snare: null, hihat: null },

    init() {
      // AudioContext created lazily on first user gesture (see resume())
    },

    _ensureContext() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = State.masterVolume;
        this.masterGain.connect(this.ctx.destination);

        ['kick', 'snare', 'hihat'].forEach(name => {
          const g = this.ctx.createGain();
          g.gain.value = State[name].volume;
          g.connect(this.masterGain);
          this.instrumentGains[name] = g;
        });
      }
    },

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    setMasterVolume(val) {
      State.masterVolume = val;
      if (this.masterGain) this.masterGain.gain.value = val;
      Storage.saveSettings();
    },

    setInstrumentVolume(instName, val) {
      State[instName].volume = val;
      if (this.instrumentGains[instName]) this.instrumentGains[instName].gain.value = val;
      Storage.saveSettings();
    },

    play(instName, time) {
      this._ensureContext();
      const idx = State[instName].soundIndex;
      const fns = this._sounds[instName];
      if (fns && fns[idx]) fns[idx].call(this, time);
    },

    // ── Sound synthesis ──────────────────────────────────────
    _sounds: {
      kick:  [null, null, null],  // filled below
      snare: [null, null, null],
      hihat: [null, null, null],
    },

    // Kick Classic — sine 60→30Hz
    _kickClassic(time) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + 0.3);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc.connect(gain);
      gain.connect(this.instrumentGains.kick);
      osc.start(time); osc.stop(time + 0.31);
    },

    // Kick Deep — sine 80→40Hz
    _kickDeep(time) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.5);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
      osc.connect(gain);
      gain.connect(this.instrumentGains.kick);
      osc.start(time); osc.stop(time + 0.51);
    },

    // Kick Punchy — triangle + noise burst
    _kickPunchy(time) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + 0.15);
      oscGain.gain.setValueAtTime(1, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(oscGain);
      oscGain.connect(this.instrumentGains.kick);

      const noise = this._makeNoise(0.1);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      noise.connect(noiseGain);
      noiseGain.connect(this.instrumentGains.kick);

      osc.start(time); osc.stop(time + 0.16);
      noise.start(time); noise.stop(time + 0.11);
    },

    // Snare Classic — noise + sine 200Hz
    _snareClassic(time) {
      const ctx = this.ctx;
      const noise = this._makeNoise(0.2);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      noise.connect(noiseGain);
      noiseGain.connect(this.instrumentGains.snare);

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 200;
      oscGain.gain.setValueAtTime(0.5, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(oscGain);
      oscGain.connect(this.instrumentGains.snare);

      noise.start(time); noise.stop(time + 0.21);
      osc.start(time); osc.stop(time + 0.16);
    },

    // Snare Tight — bandpass noise
    _snareTight(time) {
      const ctx = this.ctx;
      const noise = this._makeNoise(0.1);
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      filter.type = 'bandpass';
      filter.frequency.value = 2000;
      filter.Q.value = 1.5;
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.instrumentGains.snare);
      noise.start(time); noise.stop(time + 0.11);
    },

    // Snare Rimshot — square click + short noise
    _snareRimshot(time) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, time);
      osc.frequency.exponentialRampToValueAtTime(200, time + 0.05);
      oscGain.gain.setValueAtTime(1, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc.connect(oscGain);
      oscGain.connect(this.instrumentGains.snare);

      const noise = this._makeNoise(0.08);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.6, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      noise.connect(noiseGain);
      noiseGain.connect(this.instrumentGains.snare);

      osc.start(time); osc.stop(time + 0.06);
      noise.start(time); noise.stop(time + 0.09);
    },

    // HiHat Closed — HPF noise 8kHz, ~0.05s
    _hihatClosed(time) {
      const ctx = this.ctx;
      const noise = this._makeNoise(0.05);
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      filter.type = 'highpass';
      filter.frequency.value = 8000;
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.instrumentGains.hihat);
      noise.start(time); noise.stop(time + 0.06);
    },

    // HiHat Open — HPF noise 6kHz, ~0.3s
    _hihatOpen(time) {
      const ctx = this.ctx;
      const noise = this._makeNoise(0.3);
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      filter.type = 'highpass';
      filter.frequency.value = 6000;
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.instrumentGains.hihat);
      noise.start(time); noise.stop(time + 0.31);
    },

    // HiHat Ride — metallic partials + noise
    _hihatRide(time) {
      const ctx = this.ctx;
      [440, 587, 659, 784, 988].forEach(freq => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        oscGain.gain.setValueAtTime(0.15, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(oscGain);
        oscGain.connect(this.instrumentGains.hihat);
        osc.start(time); osc.stop(time + 0.21);
      });
      const noise = this._makeNoise(0.2);
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      filter.type = 'highpass';
      filter.frequency.value = 7000;
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.instrumentGains.hihat);
      noise.start(time); noise.stop(time + 0.21);
    },

    // ── Utility ───────────────────────────────────────────────
    _makeNoise(durationSec) {
      const ctx = this.ctx;
      const bufferSize = Math.ceil(ctx.sampleRate * durationSec);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      return source;
    },
  };

  // Wire sound function references after object is defined
  AudioEngine._sounds.kick  = [
    AudioEngine._kickClassic.bind(AudioEngine),
    AudioEngine._kickDeep.bind(AudioEngine),
    AudioEngine._kickPunchy.bind(AudioEngine),
  ];
  AudioEngine._sounds.snare = [
    AudioEngine._snareClassic.bind(AudioEngine),
    AudioEngine._snareTight.bind(AudioEngine),
    AudioEngine._snareRimshot.bind(AudioEngine),
  ];
  AudioEngine._sounds.hihat = [
    AudioEngine._hihatClosed.bind(AudioEngine),
    AudioEngine._hihatOpen.bind(AudioEngine),
    AudioEngine._hihatRide.bind(AudioEngine),
  ];

  // ─── CIRCLE RENDERER ────────────────────────────────────────────────────────
  const CircleRenderer = {
    svg: null,
    nodeEls: { kick: [], snare: [], hihat: [] },

    // Circle config: radius + fill color per instrument
    _config: {
      kick:  { radius: 100, color: '#4caf50' },
      snare: { radius: 155, color: '#e84545' },
      hihat: { radius: 210, color: '#5b9bd5' },
    },

    init() {
      this.svg = document.getElementById('sequencer-svg');
      this.redraw();

      // Beat toggle via click on SVG
      this.svg.addEventListener('click', (e) => {
        const node = e.target.closest('.beat-node');
        if (!node) return;
        const instName = node.dataset.inst;
        const step = parseInt(node.dataset.step, 10);
        toggleBeat(instName, step);
        this._updateNode(instName, step);
        Storage.saveCurrent();
      });
    },

    redraw() {
      ['kick', 'snare', 'hihat'].forEach(name => this._drawNodes(name));
    },

    _drawNodes(instName) {
      const group = document.getElementById('beats-' + instName);
      const inst = State[instName];
      const { radius, color } = this._config[instName];
      const cx = 250, cy = 250;
      const nodeR = Math.max(5, Math.min(9, 130 / inst.subdivisions));

      // Clear existing nodes
      group.innerHTML = '';
      this.nodeEls[instName] = [];

      for (let i = 0; i < inst.subdivisions; i++) {
        const angleDeg = ((i + inst.rotation) / inst.subdivisions) * 360 - 90;
        const angleRad = angleDeg * Math.PI / 180;
        const x = cx + radius * Math.cos(angleRad);
        const y = cy + radius * Math.sin(angleRad);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x.toFixed(2));
        circle.setAttribute('cy', y.toFixed(2));
        circle.setAttribute('r', nodeR);
        circle.classList.add('beat-node');
        circle.dataset.inst = instName;
        circle.dataset.step = i;

        // ARIA
        circle.setAttribute('role', 'button');
        circle.setAttribute('tabindex', '0');
        circle.setAttribute('aria-label', `${instName} beat ${i + 1}`);
        circle.setAttribute('aria-pressed', inst.beats[i] ? 'true' : 'false');

        this._styleNode(circle, inst.beats[i], color);
        group.appendChild(circle);
        this.nodeEls[instName].push(circle);
      }

      // Keyboard support for SVG nodes
      group.querySelectorAll('.beat-node').forEach(node => {
        node.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        });
      });
    },

    _updateNode(instName, stepIndex) {
      const inst = State[instName];
      const node = this.nodeEls[instName][stepIndex];
      if (!node) return;
      const color = this._config[instName].color;
      this._styleNode(node, inst.beats[stepIndex], color);
      node.setAttribute('aria-pressed', inst.beats[stepIndex] ? 'true' : 'false');
    },

    _styleNode(circle, isActive, color) {
      if (isActive) {
        circle.setAttribute('fill', color);
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('opacity', '1');
      } else {
        circle.setAttribute('fill', '#333');
        circle.setAttribute('stroke', '#666');
        circle.setAttribute('stroke-width', '1');
        circle.setAttribute('opacity', '0.7');
      }
    },

    updatePlayhead(angleDeg) {
      const el = document.getElementById('playhead');
      if (!el) return;
      const rad = angleDeg * Math.PI / 180;
      el.setAttribute('x2', (250 + 210 * Math.cos(rad)).toFixed(2));
      el.setAttribute('y2', (250 + 210 * Math.sin(rad)).toFixed(2));
    },

    // Called from rAF loop: check flashFlags and trigger flash via SVG attribute animation.
    // Uses direct SVG attribute manipulation (not CSS animation class) for reliable cross-browser
    // behavior on SVG elements (offsetWidth reflow is unreliable on SVG in Safari/Firefox).
    checkFlash() {
      ['kick', 'snare', 'hihat'].forEach(instName => {
        const inst = State[instName];
        inst.flashFlags.forEach((flag, i) => {
          if (!flag) return;
          inst.flashFlags[i] = false;
          const node = this.nodeEls[instName][i];
          const beatIdx = (i - inst.rotation + inst.subdivisions) % inst.subdivisions;
          if (!node || !inst.beats[beatIdx]) return;

          // Capture current values before modifying
          const baseR = parseFloat(node.getAttribute('r'));
          const isActive = inst.beats[beatIdx];

          // Enlarge + brighten
          node.setAttribute('r', (baseR * 1.5).toFixed(2));
          node.setAttribute('opacity', '1');
          node.style.filter = 'brightness(2)';  // CSS inline style (SVG filter attr expects url(#id), not CSS fn)

          // Restore after 80ms
          setTimeout(() => {
            node.setAttribute('r', baseR.toFixed(2));
            node.setAttribute('opacity', isActive ? '1' : '0.7');
            node.style.filter = '';
          }, 80);
        });
      });
    },

    // Update displays after subdivision/rotation changes
    updateInstrumentDisplay(instName) {
      this._drawNodes(instName);
      UI.updateInstrumentControls(instName);
    },
  };

  // ─── SEQUENCER ──────────────────────────────────────────────────────────────
  const Sequencer = {
    startTime: 0,         // audioCtx.currentTime when playback started
    nextStepTime: { kick: 0, snare: 0, hihat: 0 },
    currentStep:  { kick: 0, snare: 0, hihat: 0 },
    schedulerTimer: null,
    rafId: null,

    getMeasureDuration() {
      return (60 / State.bpm) * 4;
    },

    getStepDuration(subdivisions) {
      return this.getMeasureDuration() / subdivisions;
    },

    start() {
      if (State.isPlaying) return;
      AudioEngine._ensureContext();
      AudioEngine.resume();

      State.isPlaying = true;
      this.startTime = AudioEngine.ctx.currentTime;

      // Reset step pointers
      INSTRUMENTS.forEach(name => {
        this.nextStepTime[name] = this.startTime;
        this.currentStep[name] = 0;
      });

      this.schedulerTimer = setInterval(() => this._schedule(), SCHEDULE_INTERVAL);
      this._raf();
      UI.updatePlayButton();
    },

    stop() {
      if (!State.isPlaying) return;
      State.isPlaying = false;
      clearInterval(this.schedulerTimer);
      cancelAnimationFrame(this.rafId);
      CircleRenderer.updatePlayhead(-90); // -90° = 12 o'clock (consistent with _raf convention)
      UI.updatePlayButton();
    },

    _schedule() {
      const ctx = AudioEngine.ctx;
      const ahead = ctx.currentTime + LOOKAHEAD_TIME;

      INSTRUMENTS.forEach(name => {
        const inst = State[name];
        const stepDur = this.getStepDuration(inst.subdivisions);

        // Guard against BPM-decrease burst: if nextStepTime has fallen far behind
        // (e.g. after a large BPM decrease), clamp it forward to avoid scheduling
        // a rapid burst of catch-up beats.
        if (this.nextStepTime[name] < ctx.currentTime - stepDur) {
          this.nextStepTime[name] = ctx.currentTime;
        }
        while (this.nextStepTime[name] < ahead) {
          const step = this.currentStep[name];
          const beatIdx = (step - inst.rotation + inst.subdivisions) % inst.subdivisions;
          if (inst.beats[beatIdx]) {
            AudioEngine.play(name, this.nextStepTime[name]);
            // Set flash flag so rAF can trigger visual
            inst.flashFlags[step] = true;
          }
          this.nextStepTime[name] += stepDur;
          this.currentStep[name] = (step + 1) % inst.subdivisions;
        }
      });
    },

    _raf() {
      if (!State.isPlaying) return;
      const ctx = AudioEngine.ctx;
      const elapsed = ctx.currentTime - this.startTime;
      const measureDur = this.getMeasureDuration();
      // Subtract 90° so 0° maps to 12 o'clock (consistent with beat node positions which also use -90)
      const angle = ((elapsed % measureDur) / measureDur) * 360 - 90;
      CircleRenderer.updatePlayhead(angle);
      CircleRenderer.checkFlash();
      this.rafId = requestAnimationFrame(() => this._raf());
    },

    setBpm(bpm) {
      setBpm(bpm);
      // nextStepTime pointers remain correct — step durations adjust on next schedule tick
      Storage.saveSettings();  // saves lastBpm to rc_settings
      Storage.saveCurrent();   // saves bpm to rc_current (prevents stale BPM on page reload)
      UI.updateBpmDisplay();
    },
  };

  // ─── TAP TEMPO ──────────────────────────────────────────────────────────────
  const TapTempo = {
    taps: [],
    MAX_TAPS: 8,
    RESET_TIMEOUT: 2000,

    tap() {
      const now = Date.now();
      if (this.taps.length > 0 && now - this.taps[this.taps.length - 1] > this.RESET_TIMEOUT) {
        this.taps = [];
      }
      this.taps.push(now);
      if (this.taps.length > this.MAX_TAPS) this.taps.shift();
      if (this.taps.length >= 2) {
        const intervals = this.taps.slice(1).map((t, i) => t - this.taps[i]);
        const avg = intervals.reduce((a, b) => a + b) / intervals.length;
        const bpm = Math.round(60000 / avg);
        Sequencer.setBpm(Math.min(300, Math.max(20, bpm)));
      }
      UI.flashTapButton();
    },
  };

  // ─── STORAGE ────────────────────────────────────────────────────────────────
  const Storage = {
    // ── rc_settings ──────────────────────────────────────────
    saveSettings() {
      const data = {
        masterVolume: State.masterVolume,
        kickVolume:   State.kick.volume,
        snareVolume:  State.snare.volume,
        hihatVolume:  State.hihat.volume,
        kickSound:    State.kick.soundIndex,
        snareSound:   State.snare.soundIndex,
        hihatSound:   State.hihat.soundIndex,
        lastBpm:      State.bpm,
      };
      this._write(STORAGE_KEYS.SETTINGS, data);
    },

    loadSettings() {
      const data = this._read(STORAGE_KEYS.SETTINGS);
      if (!data) return;
      if (typeof data.masterVolume === 'number') State.masterVolume = data.masterVolume;
      if (typeof data.kickVolume   === 'number') State.kick.volume  = data.kickVolume;
      if (typeof data.snareVolume  === 'number') State.snare.volume = data.snareVolume;
      if (typeof data.hihatVolume  === 'number') State.hihat.volume = data.hihatVolume;
      if (typeof data.kickSound    === 'number') State.kick.soundIndex  = data.kickSound;
      if (typeof data.snareSound   === 'number') State.snare.soundIndex = data.snareSound;
      if (typeof data.hihatSound   === 'number') State.hihat.soundIndex = data.hihatSound;
      if (typeof data.lastBpm      === 'number') setBpm(data.lastBpm);
    },

    // ── rc_current ────────────────────────────────────────────
    // Excludes isPlaying, soundIndex, volume — those come from rc_settings
    saveCurrent() {
      const data = {
        bpm: State.bpm,
        kick:  this._serializeInst(State.kick),
        snare: this._serializeInst(State.snare),
        hihat: this._serializeInst(State.hihat),
      };
      this._write(STORAGE_KEYS.CURRENT, data);
    },

    _serializeInst(inst) {
      return {
        subdivisions: inst.subdivisions,
        rotation: inst.rotation,
        beats: inst.beats.slice(), // boolean[]
        // soundIndex and volume intentionally excluded
      };
    },

    loadCurrent() {
      const data = this._read(STORAGE_KEYS.CURRENT);
      if (!data) return;
      if (typeof data.bpm === 'number') setBpm(data.bpm);
      ['kick', 'snare', 'hihat'].forEach(name => {
        const d = data[name];
        if (!d) return;
        const subs = d.subdivisions;
        if (typeof subs === 'number' && subs >= 2 && subs <= 32) {
          State[name].subdivisions = subs;
          State[name].beats = Array(subs).fill(false).map((_, i) =>
            typeof d.beats[i] === 'boolean' ? d.beats[i] : Boolean(d.beats[i])
          );
          State[name].flashFlags = Array(subs).fill(false);
        }
        if (typeof d.rotation === 'number') {
          State[name].rotation = Math.min(d.rotation, State[name].subdivisions - 1);
        }
        // soundIndex and volume loaded from rc_settings, not here
      });
    },

    // ── rc_rhythms ────────────────────────────────────────────
    getRhythms() {
      return this._read(STORAGE_KEYS.RHYTHMS) || [];
    },

    saveRhythm(name) {
      const rhythms = this.getRhythms();
      if (rhythms.length >= MAX_RHYTHMS) {
        UI.showToast('Dosažen limit 50 rytmů — nejdříve smažte starší.', 'error');
        return false;
      }
      const rhythm = {
        id: crypto.randomUUID(),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        bpm: State.bpm,
        kick:  this._serializeInst(State.kick),
        snare: this._serializeInst(State.snare),
        hihat: this._serializeInst(State.hihat),
      };
      rhythms.push(rhythm);
      if (this._write(STORAGE_KEYS.RHYTHMS, rhythms)) {
        UI.showToast('Rytmus uložen: ' + rhythm.name);
        return true;
      }
      return false;
    },

    loadRhythm(id) {
      const rhythm = this.getRhythms().find(r => r.id === id);
      if (!rhythm) return;
      Sequencer.setBpm(rhythm.bpm);  // use Sequencer.setBpm to keep rc_settings.lastBpm in sync
      ['kick', 'snare', 'hihat'].forEach(name => {
        const d = rhythm[name];
        if (!d) return;
        setSubdivisions(name, d.subdivisions);
        State[name].beats = d.beats.map(Boolean);
        State[name].flashFlags = Array(d.subdivisions).fill(false);
        if (typeof d.rotation === 'number') {
          State[name].rotation = Math.min(d.rotation, State[name].subdivisions - 1);
        }
        // soundIndex and volume are NOT restored from saved rhythm
      });
      this.saveCurrent();
      CircleRenderer.redraw();
      UI.updateAllDisplays();
    },

    deleteRhythm(id) {
      const rhythms = this.getRhythms().filter(r => r.id !== id);
      this._write(STORAGE_KEYS.RHYTHMS, rhythms);
      UI.showToast('Rytmus smazán.');
      UI.renderSavedRhythms();
    },

    // ── Import / Export ───────────────────────────────────────
    exportJSON() {
      const date = new Date().toISOString().slice(0, 10);
      const data = {
        version: '1.0',
        exported: new Date().toISOString(),
        rhythms: this.getRhythms(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rhythm-circle-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      UI.showToast('Export dokončen.');
    },

    importJSON(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          // Validate top-level structure — version (string) and rhythms (array) required
          if (!data || typeof data.version !== 'string' || !Array.isArray(data.rhythms)) {
            throw new Error('bad structure');
          }

          const KNOWN_VERSIONS = ['1.0'];
          if (!KNOWN_VERSIONS.includes(data.version)) {
            UI.showToast('Neznámá verze souboru — importuji, ale výsledky se mohou lišit.', 'warn');
          }

          const existing = this.getRhythms();
          const existingNames = new Set(existing.map(r => r.name));
          let imported = 0, skipped = 0;
          const batchNames = new Set();
          let hitCap = false;

          for (const r of data.rhythms) {
            if (existing.length >= MAX_RHYTHMS) {
              hitCap = true;
              break;
            }
            if (!this._validateRhythm(r)) { skipped++; continue; }

            // New ID always
            r.id = crypto.randomUUID();

            // Name conflict resolution: append (2), (3), …
            let finalName = r.name;
            let counter = 2;
            while (existingNames.has(finalName) || batchNames.has(finalName)) {
              finalName = `${r.name} (${counter++})`;
            }
            r.name = finalName;
            batchNames.add(r.name);
            existingNames.add(r.name);

            existing.push(r);
            imported++;
          }

          // Always write before showing toast (avoids data loss on early exit)
          this._write(STORAGE_KEYS.RHYTHMS, existing);

          const skipMsg = skipped ? ` (${skipped} přeskočeno jako neplatné)` : '';
          const capMsg = hitCap ? ` (dosažen limit 50)` : '';
          UI.showToast(`Importováno ${imported} rytmů${skipMsg}${capMsg}.`);
          UI.renderSavedRhythms();
        } catch {
          UI.showToast('Chyba při importu — neplatný soubor.', 'error');
        }
      };
      reader.readAsText(file);
    },

    _validateRhythm(r) {
      if (typeof r.name !== 'string' || !r.name.trim()) return false;
      if (typeof r.bpm !== 'number' || r.bpm < 20 || r.bpm > 300) return false;
      for (const name of ['kick', 'snare', 'hihat']) {
        const inst = r[name];
        if (!inst) return false;
        const subs = inst.subdivisions;
        if (typeof subs !== 'number' || subs < 2 || subs > 32) return false;
        if (!Array.isArray(inst.beats) || inst.beats.length !== subs) return false;
        if (typeof inst.rotation !== 'number') return false;
        // Clamp rotation
        inst.rotation = Math.min(Math.max(0, inst.rotation), subs - 1);
      }
      return true;
    },

    // ── Internals ─────────────────────────────────────────────
    _write(key, data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          UI.showToast('Nepodařilo se uložit — plné úložiště.', 'error');
        }
        return false;
      }
    },

    _read(key) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
  };

  // ─── UI ─────────────────────────────────────────────────────────────────────
  const UI = {
    init() {
      this._bindPlayStop();
      this._bindBpm();
      this._bindTap();
      this._bindReset();
      this._bindMasterVolume();
      this._bindInstrumentControls();
      this._bindKeyboard();
      this.renderPresets();
      this.renderSavedRhythms();
      this._bindSavedRhythmsUI();
      this._bindImportExport();
      this._bindMobileTabs();
      this.updateAllDisplays();
    },

    // ── Play/Stop ────────────────────────────────────────────
    _bindPlayStop() {
      document.getElementById('btn-play-stop').addEventListener('click', () => {
        if (State.isPlaying) Sequencer.stop();
        else Sequencer.start();
      });
    },

    updatePlayButton() {
      const btn = document.getElementById('btn-play-stop');
      if (State.isPlaying) {
        btn.textContent = '■ Zastavit';
        btn.classList.add('playing');
      } else {
        btn.textContent = '▶ Přehrát';
        btn.classList.remove('playing');
      }
    },

    // ── BPM ──────────────────────────────────────────────────
    _bindBpm() {
      document.getElementById('btn-bpm-minus').addEventListener('click', () => {
        Sequencer.setBpm(State.bpm - 1);
      });
      document.getElementById('btn-bpm-plus').addEventListener('click', () => {
        Sequencer.setBpm(State.bpm + 1);
      });
      const input = document.getElementById('bpm-input');
      input.addEventListener('change', () => {
        Sequencer.setBpm(parseInt(input.value, 10) || 120);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
      });
    },

    updateBpmDisplay() {
      document.getElementById('bpm-input').value = State.bpm;
    },

    // ── TAP Tempo ─────────────────────────────────────────────
    _bindTap() {
      document.getElementById('btn-tap').addEventListener('click', () => TapTempo.tap());
    },

    flashTapButton() {
      const btn = document.getElementById('btn-tap');
      btn.classList.add('tapping');
      setTimeout(() => btn.classList.remove('tapping'), 100);
    },

    // ── Reset ────────────────────────────────────────────────
    _bindReset() {
      document.getElementById('btn-reset').addEventListener('click', () => {
        INSTRUMENTS.forEach(name => {
          State[name].beats = Array(State[name].subdivisions).fill(false);
        });
        CircleRenderer.redraw();
        Storage.saveCurrent();
      });
    },

    // ── Master Volume ─────────────────────────────────────────
    _bindMasterVolume() {
      const slider = document.getElementById('master-volume');
      slider.value = State.masterVolume;
      slider.addEventListener('input', () => {
        AudioEngine.setMasterVolume(parseFloat(slider.value));
      });
    },

    // ── Instrument Controls ───────────────────────────────────
    _bindInstrumentControls() {
      INSTRUMENTS.forEach(instName => {
        // Sound buttons
        [0, 1, 2].forEach(i => {
          document.getElementById(`${instName}-sound-${i}`).addEventListener('click', () => {
            State[instName].soundIndex = i;
            this._updateSoundButtons(instName);
            Storage.saveSettings();
          });
        });

        // Subdivisions
        document.getElementById(`${instName}-subs-minus`).addEventListener('click', () => {
          setSubdivisions(instName, State[instName].subdivisions - 1);
          CircleRenderer.updateInstrumentDisplay(instName);
          Storage.saveCurrent();
        });
        document.getElementById(`${instName}-subs-plus`).addEventListener('click', () => {
          setSubdivisions(instName, State[instName].subdivisions + 1);
          CircleRenderer.updateInstrumentDisplay(instName);
          Storage.saveCurrent();
        });

        // Rotation
        document.getElementById(`${instName}-rot-minus`).addEventListener('click', () => {
          setRotation(instName, -1);
          CircleRenderer.updateInstrumentDisplay(instName);
          Storage.saveCurrent();
        });
        document.getElementById(`${instName}-rot-plus`).addEventListener('click', () => {
          setRotation(instName, +1);
          CircleRenderer.updateInstrumentDisplay(instName);
          Storage.saveCurrent();
        });

        // Volume
        const volSlider = document.getElementById(`${instName}-volume`);
        volSlider.value = State[instName].volume;
        volSlider.addEventListener('input', () => {
          AudioEngine.setInstrumentVolume(instName, parseFloat(volSlider.value));
        });
      });
    },

    updateInstrumentControls(instName) {
      const inst = State[instName];
      document.getElementById(`${instName}-subs-display`).textContent = inst.subdivisions;
      document.getElementById(`${instName}-rot-display`).textContent = inst.rotation;
      this._updateSoundButtons(instName);
    },

    _updateSoundButtons(instName) {
      [0, 1, 2].forEach(i => {
        const btn = document.getElementById(`${instName}-sound-${i}`);
        btn.classList.toggle('sound-active', State[instName].soundIndex === i);
      });
    },

    updateAllDisplays() {
      this.updateBpmDisplay();
      this.updatePlayButton();
      INSTRUMENTS.forEach(name => this.updateInstrumentControls(name));
      // Sync volume sliders to loaded state
      document.getElementById('master-volume').value = State.masterVolume;
      INSTRUMENTS.forEach(name => {
        document.getElementById(`${name}-volume`).value = State[name].volume;
      });
    },

    // ── Keyboard Shortcuts ────────────────────────────────────
    _bindKeyboard() {
      document.addEventListener('keydown', (e) => {
        // Skip if focus is in an input, select, or contenteditable element
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (e.target.isContentEditable) return;

        switch (e.code) {
          case 'Space':
            e.preventDefault();
            if (State.isPlaying) Sequencer.stop(); else Sequencer.start();
            break;
          case 'KeyT':
            TapTempo.tap();
            break;
          case 'KeyR':
            document.getElementById('btn-reset').click();
            break;
          case 'ArrowUp':
            e.preventDefault();
            Sequencer.setBpm(State.bpm + 1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            Sequencer.setBpm(State.bpm - 1);
            break;
          case 'KeyS':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              this.showSaveModal();
            }
            break;
          case 'Escape':
            this._closeAllModals();
            break;
        }
      });
    },

    // ── Mobile Tabs ───────────────────────────────────────────
    _bindMobileTabs() {
      document.getElementById('instrument-tabs').addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        const targetId = btn.dataset.target;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
        document.querySelectorAll('.instrument-panel').forEach(p => p.classList.remove('panel-active'));
        btn.classList.add('tab-active');
        document.getElementById(targetId).classList.add('panel-active');
      });
    },

    // ── Presets ───────────────────────────────────────────────
    renderPresets() {
      const container = document.getElementById('presets-list');
      container.innerHTML = '';
      PRESETS.forEach((preset, i) => {
        const btn = document.createElement('button');
        btn.className = 'preset-btn';
        btn.textContent = preset.name;
        btn.addEventListener('click', () => {
          this._loadPreset(i);
          document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
        container.appendChild(btn);
      });
    },

    _loadPreset(index) {
      const preset = PRESETS[index];
      Sequencer.setBpm(preset.bpm);  // use Sequencer.setBpm to keep rc_settings.lastBpm in sync
      INSTRUMENTS.forEach(name => {
        const d = preset[name];
        setSubdivisions(name, d.subdivisions);
        State[name].beats = d.beats.map(Boolean);
        State[name].flashFlags = Array(d.subdivisions).fill(false);
        State[name].rotation = d.rotation ?? 0;
        // soundIndex and volume NOT changed by preset
      });
      Storage.saveCurrent();
      CircleRenderer.redraw();
      this.updateAllDisplays();
    },

    // ── Saved Rhythms ─────────────────────────────────────────
    renderSavedRhythms() {
      const container = document.getElementById('saved-rhythms-list');
      container.innerHTML = '';
      const rhythms = Storage.getRhythms();
      if (rhythms.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:12px;padding:4px 0">Žádné uložené rytmy</p>';
        return;
      }
      rhythms.forEach(r => {
        const item = document.createElement('div');
        item.className = 'saved-rhythm-item';

        const name = document.createElement('span');
        name.className = 'saved-rhythm-name';
        name.textContent = r.name;
        name.title = r.name;
        name.addEventListener('click', () => Storage.loadRhythm(r.id));

        const del = document.createElement('button');
        del.className = 'btn-delete-rhythm';
        del.textContent = '×';
        del.title = 'Smazat';
        del.setAttribute('aria-label', `Smazat ${r.name}`);
        del.addEventListener('click', () => {
          this.showConfirm(`Smazat rytmus "${r.name}"?`, () => Storage.deleteRhythm(r.id));
        });

        item.appendChild(name);
        item.appendChild(del);
        container.appendChild(item);
      });
    },

    _bindSavedRhythmsUI() {
      // Save modal
      document.getElementById('save-modal-confirm').addEventListener('click', () => {
        const name = document.getElementById('save-modal-name').value.trim();
        if (!name) return;
        if (Storage.saveRhythm(name)) {
          this._closeAllModals();
          this.renderSavedRhythms();
        }
      });
      document.getElementById('save-modal-cancel').addEventListener('click', () => this._closeAllModals());
      document.getElementById('save-modal-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('save-modal-confirm').click();
      });
    },

    showSaveModal() {
      const modal = document.getElementById('save-modal');
      const input = document.getElementById('save-modal-name');
      modal.removeAttribute('hidden');
      input.value = '';
      input.focus();
    },

    // ── Import / Export ───────────────────────────────────────
    _bindImportExport() {
      document.getElementById('btn-export').addEventListener('click', () => Storage.exportJSON());
      document.getElementById('btn-import').addEventListener('click', () => {
        document.getElementById('import-file').click();
      });
      document.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          Storage.importJSON(file);
          e.target.value = ''; // reset input
        }
      });
    },

    // ── Toasts ────────────────────────────────────────────────
    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast' + (type === 'error' ? ' error' : type === 'warn' ? ' warn' : '');
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    // ── Confirm Dialog ────────────────────────────────────────
    _confirmCleanup: null,

    showConfirm(message, onConfirm) {
      // Clean up any stale listeners from a previous call (e.g. dismissed via Escape)
      if (this._confirmCleanup) { this._confirmCleanup(); this._confirmCleanup = null; }

      const modal = document.getElementById('confirm-modal');
      document.getElementById('confirm-modal-message').textContent = message;
      modal.removeAttribute('hidden');

      const okBtn = document.getElementById('confirm-modal-ok');
      const cancelBtn = document.getElementById('confirm-modal-cancel');

      const cleanup = () => {
        modal.setAttribute('hidden', '');
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
        this._confirmCleanup = null;
      };
      const handleOk = () => { cleanup(); onConfirm(); };
      const handleCancel = () => cleanup();

      this._confirmCleanup = cleanup;
      okBtn.addEventListener('click', handleOk);
      cancelBtn.addEventListener('click', handleCancel);
    },

    _closeAllModals() {
      // Clean up confirm dialog listeners before hiding
      if (this._confirmCleanup) { this._confirmCleanup(); this._confirmCleanup = null; }
      document.querySelectorAll('.modal').forEach(m => m.setAttribute('hidden', ''));
    },
  };

  // ─── INIT ───────────────────────────────────────────────────────────────────

  function init() {
    Storage.loadSettings();   // must run first (volumes + soundIndex)
    Storage.loadCurrent();    // then beats/subdivisions/rotation/bpm
    CircleRenderer.init();
    UI.init();
  }

  document.addEventListener('DOMContentLoaded', init);

  // ─── TEST EXPORTS ────────────────────────────────────────────────────────────
  // Exposed only when test.html sets window._RC_TEST = {} before loading app.js
  if (window._RC_TEST !== undefined) {
    window._RC_TEST = { State, TapTempo, Storage, Sequencer,
                        _makeInstrument, remapBeats, setBpm };
  }

})();
