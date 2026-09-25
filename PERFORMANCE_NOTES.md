# v6 performance notes

The main startup optimizations are deliberately conservative so the site remains usable on Android phones.

- `vocal-engine.mjs` is loaded only when Fast Local vocals are requested.
- `studio-engine.mjs` is loaded only when Studio Singer is tested or used.
- The service worker precaches only the core shell instead of every optional file.
- Lower-page cards use `content-visibility:auto` so the browser can skip layout/paint work until they are near the viewport.
- Fast Local tries WebGPU when available unless data-saving mode suggests the safer WASM path.
- Kokoro uses q8 rather than falling back to the much larger q4 model file.
- One shared AudioContext decodes generated voice lines instead of creating one decoder context per line.
- A bounded in-memory line cache reuses repeated lyric lines/voices during the browser session.

The first Fast Local neural song still has to download a neural model. No HTML/JavaScript optimization can remove that model-download cost.
