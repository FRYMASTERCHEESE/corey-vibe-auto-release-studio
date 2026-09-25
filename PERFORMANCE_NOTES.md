# Performance notes — v6.3 Ultra Fast

The screenshot showing `Generating male vocal block 1/11` revealed that the remaining bottleneck was still neural inference: the phone was doing many Kokoro generations sequentially.

**Ultra Fast Local** changes the local neural path to generate the complete male vocal in one neural pass and the complete female vocal in one neural pass. It then slices and rhythmically places that already-generated audio across the song in the browser.

- Solo male/female: normally **1 neural inference pass** instead of ~5–15 blocks.
- Duet: normally **2 neural inference passes** (one per singer).
- Phones still use compact q4/WASM to avoid the fp32/WebGPU crash seen earlier.
- Mobile Safe remains available if Ultra Fast is unstable on a particular device.

This cuts request/inference overhead, but it cannot make a phone equal to Suno's server GPUs. The tradeoff is that Ultra Fast has less precise per-line vocal phrasing than the slower block mode.
