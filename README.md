# Corey Vibe Auto Release Studio v8 — Eleven Music First

The recommended workflow now uses Eleven Music for the actual full-song vocal generation, then imports the finished audio back into Corey Vibe Studio for automatic release packaging.

## Free workflow

1. Enter a song idea or load existing lyrics.
2. Tap **Prepare Song + Open Eleven Music**.
3. Paste the prepared title/style/lyrics into Eleven Music and generate the song.
4. Download the result.
5. Import it into this site.
6. The site creates a 44.1 kHz WAV master, cover, hook edits, metadata, promo art, cue sheet, captions and release ZIP.

## Rights guard

ElevenLabs currently lists the Free plan as personal-use only. The site therefore marks a Free-plan Eleven Music import as **not SoundOn/commercial-release ready**. If you have a paid/PAYG status whose current terms permit your intended use, choose the commercial option before importing. The selector does not create rights; current ElevenLabs terms control.

## API

Eleven Music has an API, but official documentation says Music API access requires paid access or a qualifying PAYG setup. Do not put an ElevenLabs API key in this public GitHub Pages repository. Full one-click automation would require a private backend that holds the secret.

## Backup modes

The old local/ACE-Step engines remain as backups, but the recommended high-quality workflow is Eleven Music First.
