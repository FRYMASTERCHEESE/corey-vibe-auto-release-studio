# Corey Vibe Auto Release Studio v3

A static browser-based music release and growth-prep website designed to run on GitHub Pages with no paid API and no server.

## What v3 adds

- **Earnings Autopilot** with editable default figures from the last-month SoundOn snapshot:
  - Commercial Music Licensing: NZ$405.910
  - TikTok: NZ$90.872
  - Other: NZ$0.061
  - Total: NZ$496.843
- Automatically recalculates which revenue source should be prioritized.
- Optional local CSV/TXT import for SoundOn earnings exports.
- Automatic 15-second and 30-second hook WAVs from each generated master.
- Automatic 1080 × 1920 vertical promo PNG.
- Automatic commercial-licensing cue sheet.
- Automatic TikTok / short-form captions.
- Automatic short-video ideas.
- Automatic Spotify pitch starter.
- Automatic release schedule.
- All release and growth assets are packed into one ZIP.

## Existing release features

- Turns one text prompt into a locally synthesized instrumental WAV master.
- Creates a 3000 × 3000 PNG cover.
- Generates a title and lyrics/writing starter.
- Builds release metadata, commercial-output-rights information, production proof and a SoundOn pre-submission checklist.
- Saves artist/contributor settings and recent projects locally on the device.
- Lets you regenerate the title, lyrics, cover or audio variation separately.
- Includes a browser compatibility check and offline service-worker cache.

## GitHub Pages install

1. Unzip this package.
2. Upload the **contents** of the folder to the root of your GitHub Pages repository. `index.html` must be at the repository root.
3. In GitHub, open **Settings → Pages**.
4. Set the source to the branch containing these files, normally `main` and `/ (root)`.
5. Wait for GitHub Pages to publish, then open the site URL.

If an older version is cached, refresh once or close/reopen the page. v3 uses a new service-worker cache name.

## Important limits

This free static build creates procedural instrumental music locally in the browser. It does **not** contain a large hosted vocal/music model, so it does not produce realistic sung vocals like a commercial generative-music service. High-quality generative vocals require compute outside GitHub Pages.

The site can automatically prepare promotion assets, but it cannot safely log into SoundOn, Spotify, TikTok, YouTube or other services on your behalf without supported authenticated APIs and user authorization. Final uploads, submissions and posts still happen in your own accounts.

No feature guarantees streams, playlist placement, promotion, licensing acceptance or revenue. Avoid artificial streaming, bots, guaranteed-stream services and guaranteed playlist placement.

## Rights

The project claims no ownership or royalty share in outputs produced with it. See `OUTPUT_RIGHTS.md` and the per-release rights file inside exported ZIPs. That does not override third-party rights, distributor terms or local copyright law.

## Technical notes

- Master audio: 44.1 kHz, 16-bit stereo PCM WAV.
- Hook files: 15-second and 30-second WAV segments generated from the same local master.
- Cover: 3000 × 3000 PNG.
- Vertical promo: 1080 × 1920 PNG.
- No CDN dependency.
- No API key.
- Earnings data remains in the browser unless the user explicitly downloads a package.
