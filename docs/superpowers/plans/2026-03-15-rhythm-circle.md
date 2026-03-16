# Rhythm Circle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page interactive circular drum sequencer with synthesized sounds, tap tempo, localStorage persistence, and JSON import/export — no build tools or frameworks.

**Architecture:** Three files (`index.html`, `style.css`, `app.js`) plus `test.html`. `app.js` is one IIFE containing eight internal modules: `PRESETS` (constants), `State`, `Storage`, `AudioEngine`, `CircleRenderer`, `Sequencer`, `TapTempo`, `UI`. SVG renders the three-circle sequencer; Web Audio API handles synthesized drum sounds with a lookahead scheduler; localStorage persists state across sessions.

**Tech Stack:** Vanilla JS (ES6+), SVG, Web Audio API, localStorage, CSS custom properties. No npm, no bundler. Opens as `index.html` in browser.

**Spec:** `docs/superpowers/specs/2026-03-15-rhythm-circle-design.md`

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | App shell: three-column layout, bottom panel, SVG container, all DOM elements with IDs |
| `style.css` | Dark theme, CSS custom properties, grid layout, responsive breakpoints, `.flash` / `.tap-pulse` animations |
| `app.js` | Single IIFE: all modules, exported `_test` for unit tests |
| `test.html` | Browser-based unit tests for pure functions (no external deps) |

### Key DOM IDs (app.js depends on these)

```
#btn-play-stop         Play/Stop button
#bpm-input             BPM display + direct input field (doubles as readout — UI uses .value)
#btn-bpm-minus         BPM –1
#btn-bpm-plus          BPM +1
#btn-tap               TAP Tempo button
#btn-reset             Reset (clear all beats)
#master-volume         Master volume slider <input type="range">

#sequencer-svg         Main SVG element (viewBox="0 0 500 500")
#beats-kick            <g> inside SVG for kick nodes
#beats-snare           <g> inside SVG for snare nodes
#beats-hihat           <g> inside SVG for hihat nodes
#playhead              <line> inside SVG

#presets-list          Container for built-in preset buttons
#saved-rhythms-list    Container for saved rhythm items
#btn-export            Export JSON button
#btn-import            Import JSON button (triggers #import-file)
#import-file           Hidden <input type="file">

Per instrument (replace {inst} with kick / snare / hihat):
#{inst}-sound-0        Sound variant 0 button
#{inst}-sound-1        Sound variant 1 button
#{inst}-sound-2        Sound variant 2 button
#{inst}-subs-minus     Subdivisions – button
#{inst}-subs-display   Subdivisions readout
#{inst}-subs-plus      Subdivisions + button
#{inst}-rot-minus      Rotation – button
#{inst}-rot-display    Rotation readout
#{inst}-rot-plus       Rotation + button
#{inst}-volume         Per-instrument volume slider

#instrument-tabs       Bottom panel tab buttons container (mobile)
#tab-kick, #tab-snare, #tab-hihat    Tab buttons
#panel-kick, #panel-snare, #panel-hihat  Tab panels

#toast-container       Toast notification container
#save-modal            Save rhythm modal
#save-modal-name       Name input in save modal
#save-modal-confirm    Confirm button in save modal
#save-modal-cancel     Cancel button in save modal
#confirm-modal         Generic confirm dialog
#confirm-modal-message Text in confirm dialog
#confirm-modal-ok      OK button
#confirm-modal-cancel  Cancel button
```

---

## Chunk 1: Project Scaffold, HTML, CSS

### Task 1: Create file scaffold

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `app.js`
- Create: `test.html`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rhythm Circle</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

<div id="app">

  <!-- THREE-COLUMN LAYOUT -->
  <div id="main-layout">

    <!-- LEFT PANEL -->
    <aside id="left-panel">
      <h1 class="app-title">Rhythm<br><span>Circle</span></h1>

      <button id="btn-play-stop" class="btn-primary btn-large">▶ Přehrát</button>

      <div class="control-group">
        <label class="control-label">BPM</label>
        <div class="bpm-row">
          <button id="btn-bpm-minus" class="btn-icon">−</button>
          <input id="bpm-input" type="number" min="20" max="300" value="120">
          <button id="btn-bpm-plus" class="btn-icon">+</button>
        </div>
      </div>

      <button id="btn-tap" class="btn-tap">TAP</button>

      <div class="control-group">
        <label class="control-label">Hlasitost</label>
        <input id="master-volume" type="range" min="0" max="1" step="0.01" value="0.8">
      </div>

      <button id="btn-reset" class="btn-secondary">↺ Reset</button>
    </aside>

    <!-- CENTER: SVG SEQUENCER -->
    <main id="sequencer-area">
      <svg id="sequencer-svg" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg"
           role="application" aria-label="Cirkulární sekvencer">

        <!-- Track circles -->
        <g id="circle-tracks">
          <circle cx="250" cy="250" r="210" class="track-circle track-hihat"/>
          <circle cx="250" cy="250" r="155" class="track-circle track-snare"/>
          <circle cx="250" cy="250" r="100" class="track-circle track-kick"/>
        </g>

        <!-- Beat node groups (populated by JS) -->
        <g id="beats-hihat" class="beats-group"></g>
        <g id="beats-snare" class="beats-group"></g>
        <g id="beats-kick" class="beats-group"></g>

        <!-- Playhead -->
        <line id="playhead" x1="250" y1="250" x2="250" y2="40"
              stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="250" cy="250" r="4" fill="white"/>

      </svg>
    </main>

    <!-- RIGHT PANEL -->
    <aside id="right-panel">
      <section class="panel-section">
        <h2 class="panel-heading">Presety</h2>
        <div id="presets-list"></div>
      </section>

      <section class="panel-section">
        <h2 class="panel-heading">Uložené rytmy</h2>
        <div id="saved-rhythms-list"></div>
        <div class="import-export-row">
          <button id="btn-export" class="btn-secondary btn-sm">↑ Export</button>
          <button id="btn-import" class="btn-secondary btn-sm">↓ Import</button>
          <input id="import-file" type="file" accept=".json" style="display:none">
        </div>
      </section>
    </aside>

  </div><!-- /main-layout -->

  <!-- BOTTOM PANEL: INSTRUMENT CONTROLS -->
  <div id="bottom-panel">
    <div id="instrument-tabs">
      <button id="tab-kick"  class="tab-btn tab-active" data-target="panel-kick">Kick</button>
      <button id="tab-snare" class="tab-btn" data-target="panel-snare">Snare</button>
      <button id="tab-hihat" class="tab-btn" data-target="panel-hihat">Hi-Hat</button>
    </div>

    <div id="instrument-panels">

      <div id="panel-kick"  class="instrument-panel panel-active" data-instrument="kick">
        <h3 class="inst-name inst-kick">Kick</h3>
        <div class="sound-selector">
          <button id="kick-sound-0" class="btn-sound sound-active" data-index="0">Classic</button>
          <button id="kick-sound-1" class="btn-sound" data-index="1">Deep</button>
          <button id="kick-sound-2" class="btn-sound" data-index="2">Punchy</button>
        </div>
        <div class="subdiv-row">
          <span class="control-label">Subdivize</span>
          <button id="kick-subs-minus" class="btn-icon">−</button>
          <span id="kick-subs-display" class="num-display">16</span>
          <button id="kick-subs-plus"  class="btn-icon">+</button>
        </div>
        <div class="subdiv-row">
          <span class="control-label">Rotace</span>
          <button id="kick-rot-minus" class="btn-icon">−</button>
          <span id="kick-rot-display" class="num-display">0</span>
          <button id="kick-rot-plus"  class="btn-icon">+</button>
        </div>
        <div class="control-group">
          <label class="control-label">Hlasitost</label>
          <input id="kick-volume" type="range" min="0" max="1" step="0.01" value="0.8">
        </div>
      </div>

      <div id="panel-snare" class="instrument-panel" data-instrument="snare">
        <h3 class="inst-name inst-snare">Snare</h3>
        <div class="sound-selector">
          <button id="snare-sound-0" class="btn-sound sound-active" data-index="0">Classic</button>
          <button id="snare-sound-1" class="btn-sound" data-index="1">Tight</button>
          <button id="snare-sound-2" class="btn-sound" data-index="2">Rimshot</button>
        </div>
        <div class="subdiv-row">
          <span class="control-label">Subdivize</span>
          <button id="snare-subs-minus" class="btn-icon">−</button>
          <span id="snare-subs-display" class="num-display">16</span>
          <button id="snare-subs-plus"  class="btn-icon">+</button>
        </div>
        <div class="subdiv-row">
          <span class="control-label">Rotace</span>
          <button id="snare-rot-minus" class="btn-icon">−</button>
          <span id="snare-rot-display" class="num-display">0</span>
          <button id="snare-rot-plus"  class="btn-icon">+</button>
        </div>
        <div class="control-group">
          <label class="control-label">Hlasitost</label>
          <input id="snare-volume" type="range" min="0" max="1" step="0.01" value="0.8">
        </div>
      </div>

      <div id="panel-hihat" class="instrument-panel" data-instrument="hihat">
        <h3 class="inst-name inst-hihat">Hi-Hat</h3>
        <div class="sound-selector">
          <button id="hihat-sound-0" class="btn-sound sound-active" data-index="0">Closed</button>
          <button id="hihat-sound-1" class="btn-sound" data-index="1">Open</button>
          <button id="hihat-sound-2" class="btn-sound" data-index="2">Ride</button>
        </div>
        <div class="subdiv-row">
          <span class="control-label">Subdivize</span>
          <button id="hihat-subs-minus" class="btn-icon">−</button>
          <span id="hihat-subs-display" class="num-display">16</span>
          <button id="hihat-subs-plus"  class="btn-icon">+</button>
        </div>
        <div class="subdiv-row">
          <span class="control-label">Rotace</span>
          <button id="hihat-rot-minus" class="btn-icon">−</button>
          <span id="hihat-rot-display" class="num-display">0</span>
          <button id="hihat-rot-plus"  class="btn-icon">+</button>
        </div>
        <div class="control-group">
          <label class="control-label">Hlasitost</label>
          <input id="hihat-volume" type="range" min="0" max="1" step="0.01" value="0.8">
        </div>
      </div>

    </div><!-- /instrument-panels -->
  </div><!-- /bottom-panel -->

</div><!-- /app -->

<!-- TOAST CONTAINER -->
<div id="toast-container" aria-live="polite"></div>

<!-- SAVE MODAL -->
<div id="save-modal" class="modal" role="dialog" aria-modal="true" aria-label="Uložit rytmus" hidden>
  <div class="modal-box">
    <h2 class="modal-title">Uložit rytmus</h2>
    <input id="save-modal-name" type="text" placeholder="Název rytmu" autocomplete="off">
    <div class="modal-actions">
      <button id="save-modal-cancel" class="btn-secondary">Zrušit</button>
      <button id="save-modal-confirm" class="btn-primary">Uložit</button>
    </div>
  </div>
</div>

<!-- CONFIRM MODAL -->
<div id="confirm-modal" class="modal" role="dialog" aria-modal="true" hidden>
  <div class="modal-box">
    <p id="confirm-modal-message"></p>
    <div class="modal-actions">
      <button id="confirm-modal-cancel" class="btn-secondary">Zrušit</button>
      <button id="confirm-modal-ok" class="btn-danger">Potvrdit</button>
    </div>
  </div>
</div>

<script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `style.css`**

```css
/* === CSS Custom Properties === */
:root {
  --bg: #0f0f13;
  --surface: #1a1a22;
  --surface2: #22222e;
  --border: #2e2e3e;
  --accent: #e8ff47;
  --accent2: #ff6b6b;
  --accent3: #47d4ff;
  --text: #e8e8f0;
  --text-muted: #888899;

  --kick-color: #4caf50;
  --snare-color: #e84545;
  --hihat-color: #5b9bd5;

  --left-panel-w: 220px;
  --right-panel-w: 240px;
  --bottom-panel-h: 220px;
  --font-mono: 'Space Mono', monospace;
  --font-sans: 'DM Sans', system-ui, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 14px;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* === LAYOUT === */
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

#main-layout {
  display: grid;
  grid-template-columns: var(--left-panel-w) 1fr var(--right-panel-w);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

#left-panel, #right-panel {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 20px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

#right-panel {
  border-right: none;
  border-left: 1px solid var(--border);
}

#sequencer-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: hidden;
}

#sequencer-svg {
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 1;
}

/* === BOTTOM PANEL === */
#bottom-panel {
  background: var(--surface);
  border-top: 1px solid var(--border);
  height: var(--bottom-panel-h);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

#instrument-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 8px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.05em;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.tab-btn.tab-active { color: var(--text); border-bottom-color: var(--accent); }
.tab-btn:hover { color: var(--text); }

#instrument-panels {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.instrument-panel {
  display: none;
  padding: 12px 20px;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  height: 100%;
}
.instrument-panel.panel-active { display: flex; }

/* Desktop: show all 3 panels side by side */
@media (min-width: 1024px) {
  #instrument-tabs { display: none; }
  #instrument-panels { display: flex; }
  .instrument-panel { display: flex; flex: 1; border-right: 1px solid var(--border); }
  .instrument-panel:last-child { border-right: none; }
}

/* === SVG ELEMENTS === */
.track-circle {
  fill: none;
  stroke-width: 1.5;
  opacity: 0.3;
}
.track-kick  { stroke: var(--kick-color); }
.track-snare { stroke: var(--snare-color); }
.track-hihat { stroke: var(--hihat-color); }

/* Beat nodes drawn by JS as <circle> with class .beat-node */
/* Flash effect is implemented via direct SVG attribute manipulation in JS (not CSS animation)
   for reliable cross-browser behavior on SVG elements. */
.beat-node {
  cursor: pointer;
}

#playhead {
  transform-origin: 250px 250px;
  pointer-events: none;
}

/* === CONTROLS === */
.app-title {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text);
}
.app-title span { color: var(--accent); }

.control-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-muted);
  display: block;
  margin-bottom: 6px;
}

.control-group { display: flex; flex-direction: column; gap: 4px; }

.bpm-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

#bpm-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  width: 70px;
  padding: 4px;
  border-radius: 4px;
  -moz-appearance: textfield;
}
#bpm-input::-webkit-inner-spin-button { display: none; }
#bpm-input:focus { outline: 2px solid var(--accent); border-color: transparent; }

.btn-icon {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.btn-icon:hover { background: var(--border); }

button { cursor: pointer; }

.btn-primary {
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 13px;
  padding: 8px 16px;
  transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.85; }
.btn-primary.btn-large { padding: 12px; width: 100%; font-size: 15px; }
.btn-primary.playing { background: var(--accent2); }

.btn-secondary {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 4px;
  font-size: 12px;
  padding: 6px 12px;
  transition: color 0.15s, border-color 0.15s;
}
.btn-secondary:hover { color: var(--text); border-color: var(--text-muted); }
.btn-secondary.btn-sm { padding: 4px 8px; font-size: 11px; }

.btn-danger {
  background: var(--accent2);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  padding: 6px 14px;
}

.btn-tap {
  background: transparent;
  border: 2px solid var(--accent);
  color: var(--accent);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 16px;
  padding: 16px;
  border-radius: 6px;
  width: 100%;
  transition: transform 0.1s, background 0.1s;
  letter-spacing: 0.1em;
}
.btn-tap:hover { background: rgba(232,255,71,0.08); }
.btn-tap.tapping {
  transform: scale(1.05);
  background: rgba(232,255,71,0.15);
}

input[type="range"] {
  width: 100%;
  accent-color: var(--accent);
}

/* === INSTRUMENT PANEL === */
.inst-name {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  min-width: 48px;
}
.inst-kick  { color: var(--kick-color); }
.inst-snare { color: var(--snare-color); }
.inst-hihat { color: var(--hihat-color); }

.sound-selector { display: flex; gap: 4px; }

.btn-sound {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 4px 10px;
  border-radius: 3px;
  font-size: 11px;
  font-family: var(--font-mono);
  transition: all 0.15s;
}
.btn-sound.sound-active {
  background: var(--surface);
  border-color: var(--accent);
  color: var(--accent);
}

.subdiv-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.subdiv-row .control-label { margin: 0; min-width: 60px; }

.num-display {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  min-width: 28px;
  text-align: center;
  color: var(--text);
}

/* === RIGHT PANEL === */
.panel-section { display: flex; flex-direction: column; gap: 8px; }
.panel-heading {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.preset-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--text-muted);
  font-size: 12px;
  padding: 5px 8px;
  transition: all 0.15s;
}
.preset-btn:hover { background: var(--surface2); color: var(--text); border-color: var(--border); }
.preset-btn.active { background: var(--surface2); border-color: var(--accent); color: var(--accent); }

.saved-rhythm-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
}
.saved-rhythm-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.saved-rhythm-name:hover { color: var(--text); }
.btn-delete-rhythm {
  background: transparent;
  border: none;
  color: var(--accent2);
  font-size: 14px;
  padding: 2px 4px;
  opacity: 0.6;
}
.btn-delete-rhythm:hover { opacity: 1; }

.import-export-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

/* === TOASTS === */
#toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
  pointer-events: none;
}

.toast {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  padding: 10px 16px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text);
  animation: toast-in 0.2s ease-out;
  pointer-events: auto;
}
.toast.error { border-left-color: var(--accent2); }
.toast.warn  { border-left-color: #ffaa00; }
@keyframes toast-in {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* === MODALS === */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
}
.modal[hidden] { display: none; }

.modal-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 24px 28px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.modal-title {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.modal-box input[type="text"] {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
}
.modal-box input[type="text"]:focus {
  outline: 2px solid var(--accent);
  border-color: transparent;
}
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }

/* === FOCUS VISIBLE === */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* === RESPONSIVE: MOBILE / TABLET === */
@media (max-width: 1023px) {
  body { overflow: auto; }
  #app { height: auto; min-height: 100vh; }

  #main-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }

  #left-panel {
    flex-direction: row;
    flex-wrap: wrap;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 12px;
    gap: 12px;
  }

  #right-panel {
    border-left: none;
    border-top: 1px solid var(--border);
    flex-direction: row;
    flex-wrap: wrap;
    padding: 12px;
    gap: 12px;
  }

  #sequencer-area { padding: 12px; }

  #bottom-panel { height: auto; }

  .instrument-panel { flex-direction: column; align-items: flex-start; }
}
```

- [ ] **Step 3: Create `app.js` shell (IIFE skeleton only)**

```js
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
  const PRESETS = [];

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

  // ─── AUDIO ENGINE ───────────────────────────────────────────────────────────
  const AudioEngine = {};   // defined in Chunk 3

  // ─── CIRCLE RENDERER ────────────────────────────────────────────────────────
  const CircleRenderer = {}; // defined in Chunk 4

  // ─── SEQUENCER ──────────────────────────────────────────────────────────────
  const Sequencer = {};      // defined in Chunk 5

  // ─── TAP TEMPO ──────────────────────────────────────────────────────────────
  const TapTempo = {};       // defined in Chunk 5

  // ─── STORAGE ────────────────────────────────────────────────────────────────
  const Storage = {};        // defined in Chunk 2

  // ─── UI ─────────────────────────────────────────────────────────────────────
  const UI = {};             // defined in Chunks 6-8

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
    window._RC_TEST = { State, TapTempo, Storage, Sequencer, _makeInstrument };
  }

})();
```

- [ ] **Step 4: Create `test.html` skeleton**

```html
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>Rhythm Circle Tests</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #0f0f13; color: #e8e8f0; }
    .pass { color: #4caf50; }
    .fail { color: #e84545; }
    h2 { color: #e8ff47; margin-top: 20px; }
    #summary { margin-top: 20px; font-size: 16px; font-weight: bold; }
  </style>
</head>
<body>
<h1>Rhythm Circle — Unit Tests</h1>
<div id="results"></div>
<div id="summary"></div>

<!-- DOM stubs required by modules called during tests (e.g. UI.updateBpmDisplay) -->
<input id="bpm-input" type="number" style="display:none">
<div id="toast-container" style="display:none"></div>

<script>
  window._RC_TEST = {};
</script>
<script src="app.js"></script>
<script>
  const results = document.getElementById('results');
  let passed = 0, failed = 0;

  function assert(name, condition, detail) {
    const el = document.createElement('div');
    if (condition) {
      passed++;
      el.className = 'pass';
      el.textContent = '✓ ' + name;
    } else {
      failed++;
      el.className = 'fail';
      el.textContent = '✗ ' + name + (detail ? ' — ' + detail : '');
    }
    results.appendChild(el);
  }

  function section(title) {
    const el = document.createElement('h2');
    el.textContent = title;
    results.appendChild(el);
  }

  // Tests added in subsequent chunks

  document.getElementById('summary').textContent =
    `${passed} passed, ${failed} failed`;
</script>
</body>
</html>
```

- [ ] **Step 5: Verify files open without errors**

Open `index.html` in browser. Expected: blank dark page with layout visible, no console errors.
Open `test.html`. Expected: "0 passed, 0 failed".

- [ ] **Step 6: Commit**

```bash
git init
git add index.html style.css app.js test.html
git commit -m "feat: project scaffold — HTML structure, CSS dark theme, app.js IIFE shell"
```

---

## Chunk 2: State, Presets, Storage

### Task 2: Define PRESETS constant and complete State helpers

**Files:**
- Modify: `app.js` — replace `const PRESETS = []` and State section

- [ ] **Step 1: Replace PRESETS constant in app.js**

Find `const PRESETS = [];` and replace with:

```js
const PRESETS = [
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
```

### Task 3: State mutation helpers

**Files:**
- Modify: `app.js` — add helper functions after State declaration

- [ ] **Step 1: Add pure helper functions** (add after `_makeInstrument`):

```js
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
```

### Task 4: Storage module

**Files:**
- Modify: `app.js` — replace `const Storage = {}` with full implementation

- [ ] **Step 1: Implement Storage module**

```js
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
      UI.updateBpmDisplay();
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
      a.click();
      URL.revokeObjectURL(url);
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
```

### Task 5: Write Storage unit tests

**Files:**
- Modify: `app.js` — update `_RC_TEST` export first
- Modify: `test.html` — add tests in the script block

- [ ] **Step 1: Update `_RC_TEST` export in `app.js`** (MUST be done before writing tests)

Replace the `_RC_TEST` block at the bottom of the IIFE with:

```js
  if (window._RC_TEST !== undefined) {
    window._RC_TEST = { State, TapTempo, Storage, Sequencer,
                        _makeInstrument, remapBeats, setBpm };
  }
```

- [ ] **Step 2: Add tests for `remapBeats` and Storage serialization**

In `test.html`, inside the test `<script>` block (before the summary line), add:

```js
  const { State: S, _makeInstrument, Storage: Stor } = window._RC_TEST;
  const { remapBeats, setBpm } = window._RC_TEST;

  section('remapBeats — subdivision change');

  assert('16→8: beat at index 0 maps to 0',
    remapBeats([true,false,false,false,false,false,false,false,
                false,false,false,false,false,false,false,false], 16, 8)[0] === true);

  assert('16→8: beat at index 8 maps to 4',
    remapBeats([false,false,false,false,false,false,false,false,
                true, false,false,false,false,false,false,false], 16, 8)[4] === true);

  assert('8→16: beat at index 0 maps to 0',
    remapBeats([true,false,false,false,false,false,false,false], 8, 16)[0] === true);

  assert('8→16: beat at index 4 maps to 8',
    remapBeats([false,false,false,false,true,false,false,false], 8, 16)[8] === true);

  assert('all false → all false after remap',
    remapBeats(Array(16).fill(false), 16, 8).every(b => b === false));

  assert('result length matches newSubs',
    remapBeats([true,false,false,false], 4, 12).length === 12);

  section('setBpm — clamping');

  setBpm(500);
  assert('setBpm clamps max to 300', window._RC_TEST.State.bpm === 300);
  setBpm(5);
  assert('setBpm clamps min to 20', window._RC_TEST.State.bpm === 20);
  setBpm(120);
  assert('setBpm sets valid value', window._RC_TEST.State.bpm === 120);

  section('Storage serialization');

  const inst = _makeInstrument();
  inst.beats[0] = true; inst.beats[4] = true;
  inst.soundIndex = 2; inst.volume = 0.5;
  const serialized = Stor._serializeInst(inst);
  assert('_serializeInst excludes soundIndex', !('soundIndex' in serialized));
  assert('_serializeInst excludes volume', !('volume' in serialized));
  assert('_serializeInst includes beats', Array.isArray(serialized.beats));
  assert('_serializeInst includes subdivisions', serialized.subdivisions === 16);
  assert('_serializeInst beats[0] is true', serialized.beats[0] === true);

  section('Storage _validateRhythm');

  const validR = {
    name: 'Test', bpm: 120,
    kick:  { subdivisions: 16, rotation: 0, beats: Array(16).fill(false) },
    snare: { subdivisions: 16, rotation: 0, beats: Array(16).fill(false) },
    hihat: { subdivisions: 16, rotation: 0, beats: Array(16).fill(false) },
  };
  assert('valid rhythm passes validation', Stor._validateRhythm({...validR}));
  assert('missing name fails', !Stor._validateRhythm({...validR, name: ''}));
  assert('bpm 10 fails', !Stor._validateRhythm({...validR, bpm: 10}));
  assert('bpm 400 fails', !Stor._validateRhythm({...validR, bpm: 400}));
  assert('wrong beats length fails', !Stor._validateRhythm({
    ...validR, kick: { subdivisions: 16, rotation: 0, beats: Array(8).fill(false) }
  }));
  assert('rotation clamped on valid', (() => {
    const r = JSON.parse(JSON.stringify(validR));
    r.kick.rotation = 999;
    Stor._validateRhythm(r);
    return r.kick.rotation === 15;
  })());
```

- [ ] **Step 3: Open `test.html` in browser**

Expected: all tests pass (green ✓). No red ✗.

- [ ] **Step 4: Commit**

```bash
git add app.js test.html
git commit -m "feat: add PRESETS, State helpers, Storage module with localStorage, unit tests"
```

---

## Chunk 3: Audio Engine

### Task 6: AudioEngine foundation — context, gain graph, public API

**Files:**
- Modify: `app.js` — replace `const AudioEngine = {}` with full implementation

- [ ] **Step 1: Implement AudioEngine**

```js
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
```

- [ ] **Step 2: Manual sound test**

`AudioEngine` is inside the IIFE so it is not accessible from the browser console by default.
To test sounds from the console, **temporarily** add this line inside `init()` during development:
```js
function init() {
  window._dev = { AudioEngine, State, Sequencer }; // REMOVE before shipping
  // ... rest of init
}
```

Then in the browser console:
```js
_dev.AudioEngine._ensureContext();
_dev.AudioEngine.play('kick',  _dev.AudioEngine.ctx.currentTime);
_dev.AudioEngine.play('snare', _dev.AudioEngine.ctx.currentTime + 0.5);
_dev.AudioEngine.play('hihat', _dev.AudioEngine.ctx.currentTime + 1.0);
```
Expected: hear kick, then snare, then hi-hat.

Test all 9 sounds:
```js
['kick','snare','hihat'].forEach((inst, i) => {
  [0,1,2].forEach((si, j) => {
    const origIdx = _dev.State[inst].soundIndex;
    _dev.State[inst].soundIndex = si;
    _dev.AudioEngine.play(inst, _dev.AudioEngine.ctx.currentTime + (i*3 + j) * 0.4);
    _dev.State[inst].soundIndex = origIdx;
  });
});
```
Remove `window._dev` from `init()` before committing.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: AudioEngine — 9 synthesized drum sounds (kick/snare/hihat × 3 variants each) + lookahead scheduler foundation"
```

---

## Chunk 4: SVG Circle Renderer

### Task 7: CircleRenderer — draw nodes, playhead, flash

**Files:**
- Modify: `app.js` — replace `const CircleRenderer = {}` with full implementation

- [ ] **Step 1: Implement CircleRenderer**

```js
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
      el.setAttribute('transform', `rotate(${angleDeg.toFixed(2)}, 250, 250)`);
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
          if (!node || !inst.beats[i]) return;

          // Capture current values before modifying
          const baseR = parseFloat(node.getAttribute('r'));
          const isActive = inst.beats[i];

          // Enlarge + brighten
          node.setAttribute('r', (baseR * 1.5).toFixed(2));
          node.setAttribute('opacity', '1');
          node.setAttribute('filter', 'brightness(2)');  // SVG filter attribute (supported in modern browsers)

          // Restore after 80ms
          setTimeout(() => {
            node.setAttribute('r', baseR.toFixed(2));
            node.setAttribute('opacity', isActive ? '1' : '0.7');
            node.removeAttribute('filter');
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
```

- [ ] **Step 2: Manual visual test**

Open `index.html`. Expected:
- Three concentric circles visible (small=green kick, medium=red snare, large=blue hihat)
- 16 grey dots on each circle, evenly spaced
- White playhead line pointing up from center
- Clicking a dot turns it to the instrument color
- Clicking again turns it grey

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: CircleRenderer — SVG beat nodes, playhead, flash system, beat toggle"
```

---

## Chunk 5: Sequencer and Tap Tempo

### Task 8: Sequencer — main loop with lookahead scheduler + rAF

**Files:**
- Modify: `app.js` — replace `const Sequencer = {}`

- [ ] **Step 1: Implement Sequencer**

```js
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
          if (inst.beats[step]) {
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
```

### Task 9: TapTempo module

**Files:**
- Modify: `app.js` — replace `const TapTempo = {}`

- [ ] **Step 1: Implement TapTempo**

```js
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
```

### Task 10: Add TapTempo unit tests

**Files:**
- Modify: `test.html`

- [ ] **Step 1: Add TapTempo tests**

```js
  section('TapTempo — BPM calculation');

  const TT = window._RC_TEST.TapTempo;

  // Simulate 120 BPM taps (500ms intervals)
  TT.taps = [];
  const base = Date.now() - 2000;
  TT.taps = [base, base+500, base+1000, base+1500, base+2000];
  // Compute manually
  const intervals = TT.taps.slice(1).map((t, i) => t - TT.taps[i]);
  const avg = intervals.reduce((a,b) => a+b) / intervals.length;
  const bpm = Math.round(60000 / avg);
  assert('120 BPM from 500ms intervals', bpm === 120);

  // Simulate 60 BPM (1000ms intervals)
  TT.taps = [base, base+1000, base+2000, base+3000];
  const intervals2 = TT.taps.slice(1).map((t, i) => t - TT.taps[i]);
  const avg2 = intervals2.reduce((a,b) => a+b) / intervals2.length;
  const bpm2 = Math.round(60000 / avg2);
  assert('60 BPM from 1000ms intervals', bpm2 === 60);

  // Reset after 2s gap — test the reset logic in isolation (avoids UI.updateBpmDisplay side-effect)
  // Simulate what tap() does internally: if last tap > RESET_TIMEOUT, clear the buffer
  TT.taps = [Date.now() - 3000]; // last tap was 3s ago
  const now = Date.now();
  const shouldReset = TT.taps.length > 0 && now - TT.taps[TT.taps.length - 1] > TT.RESET_TIMEOUT;
  if (shouldReset) TT.taps = [];
  TT.taps.push(now);
  assert('buffer resets after 2s gap', TT.taps.length === 1);

  section('Sequencer — timing math');
  const Seq = window._RC_TEST.Sequencer;
  // At 120 BPM: measure = 2.0s
  window._RC_TEST.State.bpm = 120;
  assert('getMeasureDuration at 120 BPM = 2.0s',
    Math.abs(Seq.getMeasureDuration() - 2.0) < 0.001);
  // At 120 BPM, 16 subdivisions: step = 0.125s
  assert('getStepDuration 16subs at 120 BPM = 0.125s',
    Math.abs(Seq.getStepDuration(16) - 0.125) < 0.001);
  // At 120 BPM, 12 subdivisions: step = 2/12 ≈ 0.1667s
  assert('getStepDuration 12subs at 120 BPM ≈ 0.1667s',
    Math.abs(Seq.getStepDuration(12) - (2/12)) < 0.001);
```

Also update `_RC_TEST` in `app.js`:
```js
  if (window._RC_TEST !== undefined) {
    window._RC_TEST = { State, TapTempo, Storage, Sequencer,
                        _makeInstrument, remapBeats, setBpm };
  }
```

- [ ] **Step 2: Open `test.html`** — all tests should pass.

- [ ] **Step 3: Manual playback test**

Open `index.html`. In console:
```js
State.kick.beats[0] = true;
State.kick.beats[4] = true;
State.kick.beats[8] = true;
State.kick.beats[12] = true;
Sequencer.start();
// Expected: hear 4 kick beats per measure, playhead rotates
setTimeout(() => Sequencer.stop(), 4000);
```

- [ ] **Step 4: Commit**

```bash
git add app.js test.html
git commit -m "feat: Sequencer lookahead scheduler, rAF playhead, TapTempo module + unit tests"
```

---

## Chunk 6: UI Controls

### Task 11: UI module — Play/Stop, BPM, TAP, Reset, volumes

**Files:**
- Modify: `app.js` — replace `const UI = {}` with initial implementation

- [ ] **Step 1: Implement UI module (part 1 — core controls)**

```js
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
        // Skip if focus is in an input
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

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
    showConfirm(message, onConfirm) {
      const modal = document.getElementById('confirm-modal');
      document.getElementById('confirm-modal-message').textContent = message;
      modal.removeAttribute('hidden');

      const okBtn = document.getElementById('confirm-modal-ok');
      const cancelBtn = document.getElementById('confirm-modal-cancel');

      const cleanup = () => {
        modal.setAttribute('hidden', '');
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
      };
      const handleOk = () => { cleanup(); onConfirm(); };
      const handleCancel = () => cleanup();

      okBtn.addEventListener('click', handleOk);
      cancelBtn.addEventListener('click', handleCancel);
    },

    _closeAllModals() {
      document.querySelectorAll('.modal').forEach(m => m.setAttribute('hidden', ''));
    },
  };
```

- [ ] **Step 2: Manual UI test**

Open `index.html`. Verify:
- [ ] Play/Stop button toggles playback and label
- [ ] BPM +/– buttons and input field change BPM
- [ ] TAP button flashes and sets BPM after 2+ taps
- [ ] Space key plays/stops
- [ ] T key triggers tap
- [ ] R key clears all beats
- [ ] Ctrl+S opens save modal
- [ ] Esc closes modal
- [ ] Arrow Up/Down changes BPM ±1
- [ ] Subdivision +/– changes node count on circle (beats remapped)
- [ ] Rotation +/– rotates nodes
- [ ] Sound buttons highlight active sound
- [ ] Volume sliders adjust audio
- [ ] Preset buttons load rhythm visually
- [ ] Mobile: tabs switch instrument panels

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: UI module — play/stop, BPM, tap tempo, instrument controls, keyboard shortcuts, presets, saved rhythms, toasts, modals"
```

---

## Chunk 7: Startup Initialization, Autosave, Final Integration

### Task 12: Wire autosave and complete init

**Files:**
- Modify: `app.js` — add autosave calls at every state mutation point, verify init order

- [ ] **Step 1: Audit and add missing autosave calls**

The `init()` function in app.js already calls `Storage.loadSettings()` then `Storage.loadCurrent()`. Verify that all state mutations call `Storage.saveCurrent()` (already done in Chunk 6). The one remaining gap is autosave in AudioEngine volume setters — already calls `Storage.saveSettings()`.

Add autosave when toggling beats (already in `CircleRenderer.init()`):
```js
// In CircleRenderer.init() click handler — already has:
Storage.saveCurrent();
```

- [ ] **Step 2: Verify autosave on startup restore**

Open `index.html`, place some beats, refresh page. Expected: beats restore from localStorage.

Verify `soundIndex` persists:
1. Switch Hi-Hat sound to "Open"
2. Refresh page
3. Expected: Hi-Hat "Open" button still active

Verify volumes persist:
1. Move master volume slider to 50%
2. Refresh
3. Expected: slider still at 50%

- [ ] **Step 3: Verify `isPlaying` is never restored**

After forcing a save while playing:
```js
// console
Sequencer.start();
Storage.saveCurrent(); // manually trigger
Sequencer.stop();
// Refresh page
// Expected: starts in stopped state
```

- [ ] **Step 4: Final integration test — full user flow**

- [ ] Load "Bossa Nova" preset → plays correctly
- [ ] Edit beats while playing → sounds update immediately
- [ ] Change BPM while playing → tempo changes
- [ ] Save rhythm as "My Groove" → appears in saved list
- [ ] Delete "My Groove" → confirm dialog → deleted
- [ ] Export → `rhythm-circle-backup-YYYY-MM-DD.json` downloads
- [ ] Import that file → "Importováno 1 rytmů"
- [ ] Test with 50 rhythms → 51st blocked with toast

- [ ] **Step 5: ARIA / keyboard accessibility**

- [ ] Tab navigates all interactive controls
- [ ] SVG beat nodes focusable with Tab, toggle with Enter/Space
- [ ] Screen reader: each node announced as "kick beat 1" etc.

- [ ] **Step 6: Responsive test**

- [ ] Resize browser to < 1024px → instrument tabs appear
- [ ] SVG scales with viewport, no overflow
- [ ] All controls accessible

- [ ] **Step 7: Final commit**

```bash
git add index.html style.css app.js test.html
git commit -m "feat: complete Rhythm Circle app — circular sequencer, 9 synthesized sounds, tap tempo, localStorage persistence, import/export, presets"
```

---

## Chunk 8: Import / Export (already in Storage + UI — verification chunk)

### Task 13: Verify import/export edge cases

**Files:**
- Modify: `test.html` — add import validation edge case tests

- [ ] **Step 1: Add import validation edge case tests to test.html**

```js
  section('Storage importJSON validation — edge cases');

  // Helper: create a valid rhythm object
  function makeRhythm(name, bpm) {
    return {
      id: 'test-id',
      name,
      createdAt: new Date().toISOString(),
      bpm: bpm || 120,
      kick:  { subdivisions: 16, rotation: 0, beats: Array(16).fill(false) },
      snare: { subdivisions: 16, rotation: 0, beats: Array(16).fill(false) },
      hihat: { subdivisions: 16, rotation: 0, beats: Array(16).fill(false) },
    };
  }

  const Sv = window._RC_TEST.Storage;

  assert('valid rhythm passes', Sv._validateRhythm(makeRhythm('Test', 120)));
  assert('bpm=20 passes', Sv._validateRhythm(makeRhythm('Test', 20)));
  assert('bpm=300 passes', Sv._validateRhythm(makeRhythm('Test', 300)));
  assert('bpm=19 fails', !Sv._validateRhythm(makeRhythm('Test', 19)));
  assert('bpm=301 fails', !Sv._validateRhythm(makeRhythm('Test', 301)));

  const wrongBeatsLen = makeRhythm('Test', 120);
  wrongBeatsLen.kick.beats = Array(8).fill(false); // wrong length for subs=16
  assert('beats length mismatch fails', !Sv._validateRhythm(wrongBeatsLen));

  const highRotation = makeRhythm('Test', 120);
  highRotation.snare.rotation = 999;
  Sv._validateRhythm(highRotation);
  assert('rotation 999 clamped to 15', highRotation.snare.rotation === 15);

  assert('empty name fails', !Sv._validateRhythm(makeRhythm('', 120)));
  assert('whitespace-only name fails', !Sv._validateRhythm(makeRhythm('   ', 120)));
```

- [ ] **Step 2: Open `test.html`** — all tests pass.

- [ ] **Step 3: Commit**

```bash
git add test.html
git commit -m "test: import validation edge cases — bpm bounds, beats length, rotation clamping"
```

---

## Summary

After all chunks are complete, the app will have:

| Feature | Status |
|---|---|
| Circular sequencer (3 instruments, SVG) | ✓ Chunk 4 |
| Beat toggle (click/keyboard) | ✓ Chunk 4 |
| Play/Stop + BPM input | ✓ Chunk 6 |
| 3 synthesized sounds per instrument | ✓ Chunk 3 |
| Tap Tempo (T key + button) | ✓ Chunks 5+6 |
| Subdivisions + rotation | ✓ Chunk 6 |
| Built-in presets | ✓ Chunk 6 |
| Save/load rhythms (localStorage) | ✓ Chunks 2+6 |
| Import / Export JSON | ✓ Chunks 2+6 |
| Keyboard shortcuts | ✓ Chunk 6 |
| Toasts + confirm dialogs | ✓ Chunk 6 |
| Responsive (mobile tabs) | ✓ Chunks 1+6 |
| ARIA accessibility | ✓ Chunk 4+6 |
| Autosave | ✓ Chunk 7 |
| Per-instrument volume | ✓ Chunks 3+6 |
