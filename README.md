# Corey Vibe Auto Release Studio v7 — Suno First

v7 stops treating the browser TTS singer as the main release vocal.

## Recommended workflow

1. Type the song idea or load your lyrics.
2. Press **Prepare Song + Open Suno**.
3. Use the prepared Title, Style and Lyrics in Suno Custom/Advanced Create.
4. Pick the Suno version you like and download its audio.
5. Return to this website and choose the Suno audio file.
6. Press **Import Suno Song + Finish Release**.
7. The website automatically creates:
   - 44.1 kHz / 16-bit WAV master
   - 3000×3000 cover
   - 15s + 30s hook WAVs
   - 1080×1920 promo image
   - SoundOn-style metadata/checklist
   - licensing cue sheet
   - TikTok captions / short-video ideas
   - release schedule
   - complete release ZIP

## Why this changed

The local Kokoro voice is a text-to-speech model. It can sound chopped or robotic when forced into a song.
Suno is a dedicated song-generation service and is much better suited to full sung vocals.

## API limitation

The website does not ask for a Suno password and does not scrape or automate the logged-in Suno website.
Until the user's Suno account has official Suno Platform/API access, generation remains in the user's own Suno account.
Once official API access is available, this workflow can be upgraded to direct API generation without putting secrets in public GitHub Pages code.

## Rights

Suno-generated audio remains subject to Suno's current plan and commercial-use terms.
The Corey Vibe website takes 0% of royalties from the files it prepares.
