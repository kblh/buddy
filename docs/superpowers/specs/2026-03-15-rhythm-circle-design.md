# Rhythm Circle App — Design Spec
**Date:** 2026-03-15
**Stack:** HTML + CSS + Vanilla JS (no build tools, no frameworks)
**Priority:** Production

---

## 1. Overview

An interactive circular sequencer for creating and playing drum rhythms. Three concentric circles represent three drum instruments (Kick, Snare, Hi-Hat). Beats are placed on equally-spaced nodes around each circle. A rotating playhead triggers sounds when it passes active nodes.

**Key capabilities:**
- Circular sequencer with 3 instruments, each with independent subdivisions and rotation
- Synthesized drum sounds via Web Audio API (3 variants per instrument, no external files)
- Tap Tempo (keyboard + mouse)
- Named rhythm presets (built-in, read-only) + user-saved rhythms (localStorage)
- Import / Export to JSON
- Dark theme only

---

## 2. File Structure

```
rhythm-circle/
  index.html      — HTML structure, no inline logic
  style.css       — dark theme, CSS custom properties, responsive styles
  app.js          — all logic in logical modules
  docs/
    superpowers/
      specs/
        2026-03-15-rhythm-circle-design.md
```

**No npm, no bundler, no frameworks.** Opens directly in browser (`file://` or HTTP).

**Browser requirements:** Modern browser (Chrome 90+, Firefox 88+, Safari 14+). `crypto.randomUUID()` is available in all these browsers including `file://` context.

**Language policy:** All UI text (labels, button text, modal prompts, toast messages) is in **Czech**. Internationally recognized musical genre names (preset names such as "Bossa Nova", "Tresillo") remain in their original form.

---

## 3. Internal Module Structure (app.js)

All modules implemented as plain objects / factory functions within a single IIFE or ES module scope.

| Module | Responsibility |
|---|---|
| `State` | Central application state (BPM, instruments, beats, sound selection) |
| `AudioEngine` | Web Audio API — sound synthesis, lookahead scheduler |
| `CircleRenderer` | SVG drawing, beat node updates, playhead rAF loop |
| `Sequencer` | Main loop connecting AudioEngine + CircleRenderer |
| `TapTempo` | Tap buffer algorithm (last 8 taps, 2s reset) |
| `Storage` | localStorage read/write, autosave, import/export |
| `Presets` | Built-in rhythm constants (read-only) |
| `UI` | Event listeners, DOM manipulation, toasts, modals |

---

## 4. SVG Circle Renderer

**Viewbox:** `0 0 500 500`, center `250,250`

**Circle radii:**
- Hi-Hat (outer): r=210, color `#5b9bd5`
- Snare (middle): r=155, color `#e84545`
- Kick (inner): r=100, color `#4caf50`

**Playhead:** `<line>` from center to outer edge, rotated via `transform="rotate(deg, 250, 250)"` in rAF loop.

**Beat nodes:** `<circle>` elements generated dynamically.
- Inactive: `fill: #333`, `stroke: #666`
- Active: filled with instrument color
- Flash on playhead pass: CSS class `.flash` (scale 1.4 + glow), removed after 80ms

**Flash trigger mechanism (scheduler → renderer bridge):** The flash state is stored in a separate parallel array `State.instruments[name].flashFlags: boolean[]` (same length as `beats`, all `false` by default). This keeps `beats: boolean[]` a clean persistence-ready boolean array.

When the scheduler fires a beat, it sets: `State.instruments[name].flashFlags[stepIndex] = true`. The rAF loop checks each frame: if a `flashFlag` is `true`, it adds `.flash` CSS class to the corresponding SVG node, schedules removal via `setTimeout(80ms)`, then sets the flag back to `false`. The visual flash triggers within one rAF frame (~16ms) of the scheduler setting the flag.

**Beat position formula:**
```js
angle = ((i + rotation) / subdivisions) * 360 - 90  // degrees, 0° = 12 o'clock
x = cx + radius * Math.cos(angle * Math.PI / 180)
y = cy + radius * Math.sin(angle * Math.PI / 180)
```

**Rotation semantics:** Rotation is a visual and rhythmic offset — it shifts which beat index fires first. `rotation = 1` means the pattern starts one step later. Rotation wraps around: pressing `+` at `rotation = subdivisions - 1` wraps to `0`.

**Subdivision change — preserve beat ratio (map old beats forward into new grid):**
```js
const newBeats = Array(newSubs).fill(false);
oldBeats.forEach((active, i) => {
  if (active) newBeats[Math.round(i * newSubs / oldSubs) % newSubs] = true;
});
```
This maps each active old beat to its nearest position in the new grid. Multiple old beats may merge if the new grid is coarser; no duplication occurs when expanding.

**Rotation clamp after subdivision change:** After updating subdivisions, clamp rotation to the new valid range:
```js
rotation = Math.min(rotation, newSubs - 1);
```

**SVG redrawn only on state change** (not every rAF frame). Playhead element updated every frame.

---

## 5. Audio Engine

**Sound synthesis** — programmatic via Web Audio API, no external files:

| Instrument | Sound | Synthesis |
|---|---|---|
| Kick | Classic | Sine 60→30Hz, exponential frequency ramp, ~0.3s |
| Kick | Deep | Sine 80→40Hz, slower decay, more bass |
| Kick | Punchy | Triangle 100Hz + white noise, sharp attack |
| Snare | Classic | White noise + sine 200Hz, decay ~0.2s |
| Snare | Tight | Shorter noise, more mid-freq, mechanical |
| Snare | Rimshot | Sharp click + short noise, higher pitch |
| Hi-Hat | Closed | HPF noise 8kHz, decay ~0.05s |
| Hi-Hat | Open | HPF noise 6kHz, decay ~0.3s |
| Hi-Hat | Ride | Metallic noise + partial harmonics, medium length |

**Scheduler (Web Audio lookahead pattern):**
- `setInterval` every **25ms**
- Lookahead: **100ms** ahead via `audioCtx.currentTime`
- No `setTimeout` for sound triggers (drifts)
- `AudioContext` created on first user interaction (browser autoplay policy)
- **On every Play press:** call `audioCtx.resume()` if `audioCtx.state === 'suspended'` (handles tab-switch suspension)

**Gain graph:**
```
[InstrumentGain(kick)] ─┐
[InstrumentGain(snare)]─┼─► [MasterGain] ─► audioCtx.destination
[InstrumentGain(hihat)]─┘
```

---

## 6. Sequencer & Timing

**Measure duration (shared across all instruments):**

All three instruments loop over the same wall-clock duration — one measure of 4/4 time:
```js
measureDuration = (60 / bpm) * 4  // seconds for one full measure
```

Each instrument's step duration is derived from its own subdivision count:
```js
stepDuration = measureDuration / subdivisions  // seconds per step for this instrument
```

This means:
- 16 subdivisions → 16th notes
- 12 subdivisions → 12th notes (triplet feel)
- 8 subdivisions → 8th notes

All instruments complete their pattern in exactly `measureDuration` seconds, enabling polyrhythmic layering (e.g., Hi-Hat at 16 vs. Kick at 12).

**Scheduler loop:** Each tick (every 25ms) looks ahead 100ms and schedules all steps for all instruments that fall within that window using `audioCtx.currentTime + offset`. The scheduler advances a per-instrument `nextStepTime` pointer.

**Playhead angle:** The playhead completes one full rotation per measure. Use modulo to handle looping without drift:
```js
elapsed = audioCtx.currentTime - sequencerStartTime
angle = ((elapsed % measureDuration) / measureDuration) * 360 - 90  // degrees
```
`sequencerStartTime` is set to `audioCtx.currentTime` when playback begins and never updated during playback. The modulo operator ensures the angle stays in [0°, 360°) across all measures without needing an explicit measure-boundary reset.

---

## 7. Tap Tempo

Algorithm from spec:
```js
const taps = [];
const MAX_TAPS = 8;
const RESET_TIMEOUT = 2000; // ms

function onTap() {
  const now = Date.now();
  if (taps.length > 0 && now - taps.at(-1) > RESET_TIMEOUT) taps.length = 0;
  taps.push(now);
  if (taps.length > MAX_TAPS) taps.shift();
  if (taps.length >= 2) {
    const intervals = taps.slice(1).map((t, i) => t - taps[i]);
    const avg = intervals.reduce((a, b) => a + b) / intervals.length;
    applyBPM(Math.min(300, Math.max(20, Math.round(60000 / avg))));
  }
}
```

**Triggers:**
- `T` key — Tap Tempo only (always)
- TAP button click — Tap Tempo only (always)
- `Space` key — Play/Stop only (not tap)

**Visual feedback:** TAP area scales to 1.05 for 100ms on each tap

---

## 8. Data Model

```ts
interface InstrumentState {
  subdivisions: number;   // 2–32, default 16
  rotation: number;       // 0 to subdivisions-1, wraps
  beats: boolean[];       // length = subdivisions
  soundIndex: number;     // 0, 1, or 2
  volume: number;         // 0.0–1.0
}

interface SequencerState {
  bpm: number;            // 20–300
  // isPlaying is NOT persisted — always starts stopped
  kick: InstrumentState;
  snare: InstrumentState;
  hihat: InstrumentState;
}

interface SavedRhythm {
  id: string;             // crypto.randomUUID()
  name: string;
  createdAt: string;      // ISO 8601
  bpm: number;
  kick: Omit<InstrumentState, 'volume' | 'soundIndex'>;   // includes only: subdivisions, rotation, beats
  snare: Omit<InstrumentState, 'volume' | 'soundIndex'>;
  hihat: Omit<InstrumentState, 'volume' | 'soundIndex'>;
  // Loading a saved rhythm restores: bpm, beats, subdivisions, rotation.
  // soundIndex and volume are NOT saved and are NOT changed when a rhythm is loaded.
  // Both are managed exclusively via rc_settings (sole authoritative source).
}

interface Settings {
  masterVolume: number;   // 0.0–1.0
  kickVolume: number;
  snareVolume: number;
  hihatVolume: number;
  kickSound: number;      // 0, 1, 2
  snareSound: number;
  hihatSound: number;
  lastBpm: number;
}
```

**localStorage keys:**
- `rc_current` — `SequencerState` (auto-saved on every change; `isPlaying` excluded / always `false` on restore; `volume` in `InstrumentState` is excluded — volumes are read from `rc_settings` on startup)
- `rc_settings` — `Settings` object — **authoritative source for all volume values**
- `rc_rhythms` — array of `SavedRhythm` (max 50)

**Startup initialization order:**
1. Load `rc_settings` → apply master volume, per-instrument volumes, sound selections (`kickSound`, `snareSound`, `hihatSound`), lastBpm
2. Load `rc_current` → apply bpm, subdivisions, rotation, beats only (`soundIndex` and `volume` are excluded from `rc_current` restore — both come exclusively from `rc_settings` in step 1)
3. If neither key exists, use defaults

**soundIndex authority:** `rc_settings` is the sole authoritative source for sound selection. Although `InstrumentState` contains `soundIndex` at runtime, when serializing to `rc_current` the `soundIndex` field is omitted (or ignored on read). This prevents any conflict between the two keys.

**localStorage error handling:** All writes wrapped in try/catch. On `QuotaExceededError`: show toast "Nepodařilo se uložit — plné úložiště", do not crash.

**Overflow at 50 rhythms:** When user tries to save a 51st rhythm, show toast "Dosažen limit 50 rytmů — nejdříve smažte starší." Do not save, do not silently fail.

---

## 9. Built-in Presets

Read-only constants. Stored as an array of `PresetRhythm` objects. Loading a preset applies its `bpm`, `beats`, `subdivisions`, and `rotation` to all instruments, but does **not** change sound selection or volumes.

**All 16-subdivision patterns are in 4/4. Beat arrays are 0 = silent, 1 = hit.**

```js
const PRESETS = [
  {
    name: "Basic Rock",
    bpm: 120,
    kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0] },
    snare: { subdivisions: 16, rotation: 0, beats: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] },
    hihat: { subdivisions: 16, rotation: 0, beats: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] }
  },
  {
    name: "Bossa Nova",
    bpm: 120,
    kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0] },
    snare: { subdivisions: 16, rotation: 0, beats: [0,0,1,0,0,0,1,0,0,0,0,1,0,0,1,0] },
    hihat: { subdivisions: 16, rotation: 0, beats: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] }
  },
  {
    name: "Tresillo",
    bpm: 120,
    kick:  { subdivisions: 8, rotation: 0, beats: [1,0,0,1,0,0,1,0] },
    snare: { subdivisions: 8, rotation: 0, beats: [0,0,0,0,1,0,0,0] },
    hihat: { subdivisions: 8, rotation: 0, beats: [1,1,1,1,1,1,1,1] }
  },
  {
    name: "Son Clave",
    bpm: 120,
    kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0] },
    snare: { subdivisions: 16, rotation: 0, beats: [0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0] },
    hihat: { subdivisions: 16, rotation: 0, beats: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] }
  },
  {
    name: "Rumba Clave",
    bpm: 100,
    kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,1,0,0,0,1,0,0,1,0,1,0,0,0] },
    snare: { subdivisions: 16, rotation: 0, beats: [0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0] },
    hihat: { subdivisions: 16, rotation: 0, beats: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] }
  },
  {
    name: "Shiko",
    bpm: 120,
    kick:  { subdivisions: 8, rotation: 0, beats: [1,0,0,0,1,0,0,0] },
    snare: { subdivisions: 8, rotation: 0, beats: [0,0,1,0,0,0,1,0] },
    hihat: { subdivisions: 8, rotation: 0, beats: [1,0,0,1,0,0,1,0] }
  },
  {
    name: "Bembé",
    bpm: 120,
    kick:  { subdivisions: 12, rotation: 0, beats: [1,0,1,0,1,0,0,1,0,1,0,0] },
    snare: { subdivisions: 12, rotation: 0, beats: [0,0,0,1,0,0,1,0,0,0,1,0] },
    hihat: { subdivisions: 12, rotation: 0, beats: [1,1,0,1,1,0,1,1,0,1,1,0] }
  },
  {
    name: "Samba",
    bpm: 140,
    kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0] },
    snare: { subdivisions: 16, rotation: 0, beats: [0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,0] },
    hihat: { subdivisions: 16, rotation: 0, beats: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] }
  },
  {
    name: "Gahu",
    bpm: 120,
    kick:  { subdivisions: 8, rotation: 0, beats: [1,0,0,1,0,0,1,0] },
    snare: { subdivisions: 8, rotation: 0, beats: [0,1,0,0,1,0,0,1] },
    hihat: { subdivisions: 8, rotation: 0, beats: [1,0,1,0,1,0,1,0] }
  },
  {
    name: "Soukous",
    bpm: 130,
    kick:  { subdivisions: 16, rotation: 0, beats: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] },
    snare: { subdivisions: 16, rotation: 0, beats: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0] },
    hihat: { subdivisions: 16, rotation: 0, beats: [1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,0] }
  },
  {
    name: "Steve Reich",
    bpm: 132,
    kick:  { subdivisions: 12, rotation: 0, beats: [1,0,0,1,0,0,1,0,0,1,0,0] },
    snare: { subdivisions: 12, rotation: 1, beats: [1,0,0,1,0,0,1,0,0,1,0,0] },
    hihat: { subdivisions: 12, rotation: 2, beats: [1,0,0,1,0,0,1,0,0,1,0,0] }
  },
  {
    name: "Fume-fume",
    bpm: 115,
    kick:  { subdivisions: 10, rotation: 0, beats: [1,0,1,0,0,1,0,1,0,0] },
    snare: { subdivisions: 10, rotation: 0, beats: [0,0,0,1,0,0,0,0,1,0] },
    hihat: { subdivisions: 10, rotation: 0, beats: [1,1,1,1,1,1,1,1,1,1] }
  }
];
```

---

## 10. Import / Export

**Export:**
- All saved rhythms → `rhythm-circle-backup-YYYY-MM-DD.json`
- Via `Blob` + `URL.createObjectURL` + virtual `<a download>`
- Pretty-printed JSON (`JSON.stringify(data, null, 2)`)

**Import:**
- Hidden `<input type="file" accept=".json">`
- Validates structure before applying
- Conflict resolution: Rename (append number, e.g. "My Beat (2)")
- Toast: "Importováno N rytmů"
- **50-rhythm cap during import:** Import stops adding rhythms once the total reaches 50. Remaining valid entries are skipped. Toast shows: "Importováno N rytmů (dosažen limit 50)."

**Validation rules for import:**
- Top-level must have `version` (string) and `rhythms` (array)
- Unknown `version` values: show warning toast but proceed with import
- Each rhythm must have: `id` (string), `name` (string), `bpm` (number 20–300), `kick`/`snare`/`hihat` objects each with `subdivisions` (number 2–32), `beats` (array of length == subdivisions, values 0/1/true/false), `rotation` (number)
- Invalid entries are skipped; valid ones are imported
- Toast shows: "Importováno N rytmů (M přeskočeno jako neplatné)"
- **Rotation bounds:** If imported `rotation >= subdivisions`, clamp it: `rotation = Math.min(rotation, subdivisions - 1)`
- **ID policy:** Each imported rhythm always receives a new `crypto.randomUUID()` (original IDs from the file are discarded to prevent collisions)
- **Name collision detection:** Compares against all names currently in `rc_rhythms` plus all names already processed in the current import batch
- **Known versions:** `['1.0']`. Warning toast for unknown version: "Neznámá verze souboru — importuji, ale výsledky se mohou lišit."
- **Loading a preset or saved rhythm immediately overwrites `rc_current`** (autosave applies on load)

**Export format:**
```json
{
  "version": "1.0",
  "exported": "2026-03-15T12:00:00Z",
  "rhythms": [
    {
      "id": "uuid-string",
      "name": "Můj rytmus",
      "createdAt": "2026-03-01T10:00:00Z",
      "bpm": 120,
      "kick":  { "subdivisions": 16, "rotation": 0, "beats": [1,0,0,0,...] },
      "snare": { "subdivisions": 16, "rotation": 0, "beats": [0,0,0,0,...] },
      "hihat": { "subdivisions": 16, "rotation": 0, "beats": [1,0,1,0,...] }
    }
  ]
}
```

---

## 11. UI Layout

### Desktop (1280px+)

Three-column layout:

| Left panel (220px) | Center (flex 1) | Right panel (240px) |
|---|---|---|
| Play/Stop button | SVG circle sequencer | Built-in presets list |
| BPM input (+/– buttons) | | User saved rhythms |
| TAP button (large) | | Export / Import buttons |
| Reset button (clears all beats only) | | |
| Master volume slider | | |

**Bottom panel (full width):** 3 instrument controls with tabs on mobile.
Each tab shows: sound selector (3 buttons), subdivisions (+/–), rotation (+/–), volume slider.

**Reset button:** Clears only the beat arrays for all instruments. Does NOT reset BPM, subdivisions, rotation, or sound selection.

### Mobile / Tablet

- Bottom panel: tabs (Kick / Snare / Hi-Hat)
- SVG scales to full width via viewBox
- Left/right panels collapse or stack vertically

---

## 12. Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Stop |
| `T` | Tap Tempo |
| `R` | Reset current rhythm (clear beats only) |
| `↑` / `↓` | BPM +1 / -1 |
| `Ctrl+S` | Save rhythm (open dialog) |
| `Esc` | Close modal/dialog |

Note: `Space` and `T` are separate — `Space` does NOT trigger Tap Tempo.

---

## 13. Notifications & Feedback

- **Toast** (bottom-right, 3s autoclose, slide-in): save, delete, import, export, errors
- **Flash** on active beat when playhead passes (scale + glow, 80ms)
- **TAP pulse** (scale 1.05, 100ms)
- **Confirm dialog** for destructive actions (delete rhythm)

---

## 14. Accessibility

- ARIA labels on interactive SVG elements (`role="button"`, `aria-pressed`, `aria-label`)
- Keyboard navigation via Tab for all controls
- WCAG AA contrast ratios
- Visible focus styles

---

## 15. Priority Summary

| Feature | Priority |
|---|---|
| Circular sequencer + playback | MUST |
| Beat toggle (click nodes) | MUST |
| Play/Stop + BPM input | MUST |
| 3 sounds per instrument (synthesized) | MUST |
| Tap Tempo | MUST |
| Save rhythms (localStorage) | MUST |
| Import / Export JSON | MUST |
| Built-in presets | SHOULD |
| Subdivisions + rotation | SHOULD |
| Keyboard shortcuts | SHOULD |
| Per-instrument volume | NICE |
| Rhythm duplication | NICE |
