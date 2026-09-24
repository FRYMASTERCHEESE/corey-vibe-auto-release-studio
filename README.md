# Corey Vibe Auto Release Studio v5

A static GitHub Pages music-release studio that creates a procedural backing track, sung-style vocal master, instrumental alternate, artwork, metadata, hook edits and growth/licensing files from one prompt or imported lyrics + metadata.

## v5 highlights

- Pick **Solo male**, **Solo female**, **Male + female duet**, or **Auto from prompt**.
- Separate male and female voice selectors.
- Duet mode automatically alternates verses and can layer both voices on choruses.
- Exports a combined vocal stem plus separate male/female stems when available.
- Neural vocal mode uses Kokoro in the browser; no paid API key is required.
- If the neural model cannot load, the release still completes using the built-in synthetic fallback.
- Imports existing lyrics and SoundOn-style metadata TXT files.
- Includes the `Into The Uplifting` example.
- Automatic lyric quality check removes prompt-like keyword lines before vocal rendering.
- Earnings Autopilot starts with Commercial Music Licensing / TikTok / Other values and changes the growth focus when the figures change.
- Creates a 44.1 kHz / 16-bit stereo WAV, 3000×3000 cover, 15s + 30s hooks, 1080×1920 promo image, metadata, licensing cue sheet, captions, short-video ideas, release schedule and complete ZIP.

## Important vocal limitation

Kokoro is a high-quality text-to-speech model. v5 rhythmically fits and pitch-shapes its voice into a **sung-style** vocal layer. It is more human-like than an oscillator-only singer but is not the same as a large dedicated text-to-song singing model. Results vary by device, lyrics, voice and arrangement.

## GitHub Pages install

1. Upload the **contents** of this folder to the repository root.
2. Make sure `index.html`, `app.js`, `vocal-engine.mjs`, `styles.css` and `service-worker.js` are at the top level.
3. In GitHub: **Settings → Pages → Deploy from a branch → main → /(root)**.
4. Open the HTTPS Pages URL.
5. If an older version is cached, close/reopen the site or refresh once; v5 uses a new service-worker cache name.

## First neural song

The first neural-vocal song downloads the model files, so it can take longer and uses more data. Later runs can use the browser cache. On a lower-memory phone, the built-in fallback is available.

## Commercial use

The website takes 0% of royalties and claims no ownership share in outputs. Read `OUTPUT_RIGHTS.md` and `THIRD_PARTY_NOTICES.md` for the important limits.

Do not use fake streams, automated looping, impersonation of real singers, or misleading metadata. Follow distributor and streaming-platform disclosure rules when they apply.
