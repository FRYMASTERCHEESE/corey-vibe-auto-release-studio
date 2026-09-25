# Performance notes — v6.1 speed update

The biggest local-vocal slowdown was not page loading. It was generating every lyric line as a separate neural TTS job.

v6.1 changes Fast Local so it:

- groups several consecutive lyric lines into one vocal block;
- usually turns a 20+ line song into roughly 5–8 blocks per singer instead of 20+ separate generations;
- preloads the neural model in parallel while the instrumental is being rendered;
- uses WebGPU + fp32 when available, following Kokoro's recommended WebGPU configuration;
- falls back to a smaller q4 WASM model on devices without useful WebGPU;
- keeps the session vocal cache so repeated blocks are reused.

`Turbo Local` is now the default for new installs.

This should materially reduce local generation time, especially on phones, but it still cannot match a cloud service such as Suno because Suno runs large music models on server GPUs. The optional Studio Singer backend remains the path for server-side full-song generation.
