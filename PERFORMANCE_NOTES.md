# Performance notes — v8 Eleven Music First

The recommended workflow no longer asks the phone to generate the final lead vocal locally. Instead, the website prepares the title, lyrics, arrangement and style prompt, then opens Eleven Music for full-song generation.

After the user downloads the Eleven Music result, the site imports it and performs the lightweight local work: audio normalization, cover creation, hook edits, promo image, metadata, cue sheet and ZIP packaging.

This avoids the major Android bottleneck that occurred when Kokoro neural voice inference ran inside Chrome. Fast Local and ACE-Step remain available only as backup modes.
