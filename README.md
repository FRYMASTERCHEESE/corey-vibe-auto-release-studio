# Corey Vibe Auto Release Studio v6

A static GitHub Pages release studio for Corey Vibe. v6 focuses on two goals:

1. **Faster page/startup performance** on phones.
2. A path to **real full-song generative vocals** through an optional ACE-Step 1.5 backend, instead of trying to make a text-to-speech voice behave like a professional singing model.

## v6 highlights

- **Fast startup:** the large/local vocal code is lazy-loaded only when a local vocal song is actually created.
- **Smaller core service-worker install:** only the files needed to open the app are precached; optional engines cache on demand.
- **Fast Local performance selection:** WebGPU is tried automatically when available, with WASM fallback.
- **Reusable local voice cache:** repeated lines/voices are reused during the browser session instead of being regenerated every time.
- **Shared audio decoder:** avoids repeatedly opening/closing an AudioContext for every lyric line.
- **Studio Singer connector:** optional ACE-Step 1.5 HTTP API integration for a much more realistic generated full song with vocals.
- **Automatic engine mode:** uses Studio Singer when a Studio URL is configured; otherwise uses Fast Local.
- **Male / female / duet:** still available. In Studio mode the vocal arrangement is sent as part of the music-generation description.
- **Fallback protection:** if Studio Singer is unavailable, the workflow falls back to Fast Local and records that fact in the release metadata.
- Existing automatic cover, 15s/30s hooks, SoundOn metadata, licensing cue sheet, TikTok captions, vertical promo image, release schedule, Earnings Autopilot and full release ZIP remain.

## Why Studio Singer is separate

GitHub Pages is static hosting. It cannot run a large GPU music model on the server. Fast Local can run Kokoro in the browser, but Kokoro is fundamentally a text-to-speech model, not a dedicated full-song singing model.

ACE-Step 1.5 is a dedicated music-generation system that accepts a style prompt and lyrics and can generate a full mix with vocals. It requires compute outside GitHub Pages — normally your own computer with a GPU or a cloud GPU/server.

The website contains the connector, but **does not secretly send songs anywhere**. Studio mode only contacts the URL you enter in the Studio Singer connection box.

## Install on GitHub Pages

Upload the **contents** of this folder to the root of your existing repository and replace the older v5 files. Keep these files at the repository root:

- `index.html`
- `styles.css`
- `app.js`
- `vocal-engine.mjs`
- `studio-engine.mjs`
- `service-worker.js`
- `into_the_uplifting_lyrics.txt`
- `into_the_uplifting_metadata.txt`
- the other README/licence files

Then close and reopen the GitHub Pages site once. v6 uses a new cache name.

## Fast Local mode

Fast Local uses Kokoro in-browser. The first neural song still requires the model download. The current q8 model is much smaller than the fp32 model and is cached by the browser/runtime after download. The site tries WebGPU when useful and falls back to WASM.

Fast Local is useful as a free/offline-ish fallback, but it should not be described as equivalent to a dedicated music model.

## Studio Singer mode

The website is compatible with the ACE-Step 1.5 asynchronous API flow:

- `GET /health`
- `POST /release_task`
- `POST /query_result`
- `GET /v1/audio`

Use an **HTTPS** endpoint when calling it from GitHub Pages. If you run ACE-Step on your own Windows computer, see the separate `corey-vibe-studio-singer-backend` helper package.

### Studio instrumental note

Studio mode generates the vocal/full mix as one complete generated song. v6 keeps the website's local procedural instrumental as an alternate, but that alternate is **not an extracted stem of the Studio mix**. The exported metadata states this clearly.

## Rights and platform rules

The Corey Vibe website takes 0% of royalties and claims no ownership share in its project-generated output. Third-party models/software remain subject to their own licences and terms. See `OUTPUT_RIGHTS.md` and `THIRD_PARTY_NOTICES.md`.

No model or software can guarantee copyrightability, distributor acceptance, zero similarity to existing works, streams, licensing placements or revenue. Review every final master and follow any distributor/platform disclosure rules that apply.
