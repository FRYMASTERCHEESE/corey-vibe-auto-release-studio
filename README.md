# Corey Vibe Auto Release Studio v4

A static GitHub Pages music-release studio that creates a backing track, sung-vocal master, instrumental alternate, artwork, metadata and a growth/licensing pack from one prompt or imported lyrics + metadata.

## What v4 adds

- **Vocal Autopilot**: default workflow creates a sung-vocal master instead of only an instrumental.
- **Neural Singer mode**: optionally loads the open-source Kokoro browser TTS model on first use, generates a human-like voice layer locally on the device, then rhythmically tunes/times it into the song.
- **Lightweight Singer fallback**: if the neural model cannot load or the device struggles, the site automatically falls back to a small built-in singing synthesizer.
- **Instrumental alternate**: every vocal project also keeps a separate instrumental WAV for licensing and alternate releases.
- **Vocal stem**: exports the isolated vocal layer when vocals are enabled.
- **Lyrics + metadata import**: load existing `.txt` lyrics and SoundOn-style metadata files.
- **Automatic lyric quality gate**: detects prompt-like keyword dumps (for example, a line starting with “The story is …”) and replaces them before vocal rendering.
- Includes the user's `Into The Uplifting` lyrics and metadata as an example that can be loaded with one button.

## Existing automatic release workflow

- One prompt → title + lyrics + arrangement.
- 44.1 kHz / 16-bit stereo WAV master.
- 3000 × 3000 cover.
- 15s + 30s hook WAVs.
- 1080 × 1920 promo PNG.
- SoundOn-style metadata and checklist.
- Commercial-licensing cue sheet.
- TikTok captions, short-video ideas, Spotify pitch starter and release schedule.
- Earnings Autopilot using Commercial Music Licensing / TikTok / Other revenue mix.
- One ZIP containing the whole release and growth pack.

## Neural Singer first use

Neural Singer is still free: there is no paid API key or server account. The browser downloads the Kokoro model the first time it is used and runs inference locally. The download is large enough that Wi‑Fi is recommended. On lower-memory phones, select **Lightweight synthetic singer** in Advanced settings.

The neural voice is a speech model that v4 rhythmically tunes and aligns to the generated backing track. It is much more voice-like than the old instrumental-only build, but it is not the same as a dedicated studio singing model such as a large cloud text-to-song service. Results vary by device, lyrics and voice preset.

## GitHub Pages install

1. Unzip this package.
2. Upload the **contents** of the folder to the root of the GitHub repository. `index.html` must be at the repository root.
3. Open **Settings → Pages**.
4. Publish the `main` branch from `/ (root)`.
5. Open the Pages URL over HTTPS. Neural Singer will not work correctly if you open `index.html` directly as a `file://` page.

If an older version is cached, refresh once or close/reopen the site. v4 uses a new service-worker cache.

## Rights and limits

The project claims no ownership or royalty share in outputs and takes 0% of revenue. See `OUTPUT_RIGHTS.md`.

Neural Singer uses third-party open-source software/model weights. See `THIRD_PARTY_NOTICES.md`. Third-party licensing does not guarantee that every output is copyrightable or accepted by SoundOn, Spotify or another distributor. Final platform submission remains the user's responsibility.

No feature guarantees streams, playlist placement, licensing placements, promotion or revenue. Do not use bots, fake streams, coordinated looping or guaranteed-playlist services.
