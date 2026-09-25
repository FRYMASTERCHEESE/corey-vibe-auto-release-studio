# Performance notes — v6.2 mobile-safe update

The v6.1 speed build could still crash a phone browser because its Turbo path could choose fp32 WebGPU and preload the model at the same time as a 44.1 kHz stereo instrumental was being rendered. A browser-level “Aw, Snap!” happens outside normal JavaScript error handling, so the site cannot recover that in-page.

v6.2 changes the phone path:

- **Mobile Safe** is the default.
- Android/iPhone/mobile devices use compact **q4 WASM** first, with q8 as fallback.
- fp32 WebGPU is reserved for non-mobile/high-memory devices.
- model preloading in parallel with instrumental rendering is disabled on phones.
- mobile vocal blocks are limited to three lyric lines each.
- the decoded vocal cache is reduced to four entries on phones and cleared after the song finishes.
- the fast grouped-block workflow remains in place.

This may be slightly slower than an fp32 WebGPU run that succeeds, but it is designed to finish reliably instead of crashing the tab. A server-side Studio Singer remains the only realistic way to get Suno-like speed and quality without doing the heavy work on the phone.
