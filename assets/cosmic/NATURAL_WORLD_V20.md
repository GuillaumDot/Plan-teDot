# Natural World Engine V2.0 — design specification

Status: proposed, not implemented. Preserve stable engine and existing saves. Claude leads integration; ChatGPT contributes graphics and procedural design.

Generate continuous spherical fields for elevation, temperature, humidity, geology and wind from versioned seeds. Derive biomes from these fields, including orographic rainfall, downhill drainage, erosion approximations, vegetation suitability and settlement suitability. Use cube-sphere quadtree chunks with consistent border samples, LOD stitching and bounded caches. Precompute slow geology; update weather at low frequency; interpolate visual animation per frame. Save seeds, generator versions and sparse changes, not every object. Preserve existing worlds with explicit migrations only.

Dual Identity: one planet, two artistic identities, one continuous terrain. Blend material palettes and atmosphere through a deterministic geodesic transition field, modulated by terrain and climate. Avoid geometry popping, arbitrary biome borders and duplicate worlds. Artist supplies both cover artworks; derive palettes only after inspection. Face cachée release target: 2027-01-16; keep unreleased assets private and gate release server-side. Audio remains independent; use smoothed bounded audio modulation for waves, light and particles, not permanent terrain changes.

Integrate on lab branch behind flags. Reuse existing V1.8/V1.9 assets and engine; no parallel render loop. Validate seams, determinism, save compatibility, shader compilation, frame times and memory on iPhone; target stable 30 FPS, optional 60 FPS. No claims of photorealism or performance before actual engine tests.
