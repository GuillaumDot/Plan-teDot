# PlanèteDot V10 — laboratoire

🤝 means the owner approves continuing development without intermediate approvals. Production activation remains gated on the owner's explicit final iPhone validation.

Alpha.1: independent sampler-free spherical WebGL2 shader, with procedural material colors, climate, atmosphere and an independent textured Canvas2D fallback. The isolated Chromium shader test passed for all 12 planet types (run 45930523650). This is not an end-to-end Safari test.

Alpha.2: optical relief lighting, cloud shadows, progressive procedural urban surface blocks, metallic and rocky strata, and distance-dependent detail. No true 3D buildings or meshes are activated yet. The dual-face palette is an experimental preview only, not actual cover artwork. Preserve private release assets. No database migration.

Acceptance: verify real app startup, user worlds, music and lock-screen playback, all planet types and close-up on iPhone, reactions, deterministic geometry, performance, and fallback. Do not merge or publish main before user validation. Existing GitHub Pages production is unchanged by this branch.

Alpha.3 added a pixel visibility watchdog and reaction anchors. Alpha.4 resolves multisample framebuffer probes via a reusable 2x2 single-sample target, restores framebuffer bindings, and separates probe failure from actual draw errors. CI includes a real MSAA regression; physical iPhone validation is still required.

Alpha.4 MSAA test failed on both browsers (10/11 passed each). Alpha.5 corrects the resolve rectangle to identical source/destination coordinates using the existing postprocessing framebuffer, without additional GPU memory. New run required.

Alpha.5 confirmed green on Chromium and WebKit (run 45948105599). The next CI gate exercises the actual application in an offline iPhone 13 viewport: boot, enter the built-in album system, land on the planet, and sample the final displayed frame. Its instrumentation exists only inside the test. It does not validate real accounts, audio assets or physical iPhone performance.

The offline app integration test passed on both browsers (12/12 per browser, run 45948527665), with no JavaScript errors and active living-world rendering. Sampled album pixels were dark. Alpha.6 adds a controlled shadow lift, a distinct animated vortex material, distance-filtered fine detail, earlier optical relief activation on small screens, and consistent fallback lighting. These are shader changes, not Blender geometry; validation on hardware remains open.

Alpha.7 improves the CPU recovery renderer: distinct materials for 12 types, axial tilt, stellar treatment, cache keys that include atmosphere, and quantized lighting. Added actual production-function regression for deterministic output and bounded cache. This fallback still depends on the app booting with WebGL2; it is not a complete WebGL-free engine.

Alpha.7 passed both browser suites (run 45949023913). Alpha.8 reintroduces existing Blender normal maps into the V10 renderer (previously sampler-free only), using an independent optional shader and retaining the procedural fallback. More prominent mineral veins, telluric strata and stellar granulation are added independently of music progression. The existing maps load by default on V10; ?pbr=0 disables them. Integration test serves actual PNG files and requires a mapped draw. This does not add new geometry or prove physical iPhone performance.

Alpha.8 passed 26/26 tests on Chromium and WebKit (run 45949611484), with all five normal maps loaded and actual mapped draws. Alpha.9 adds five baked albedo maps after normals, bounded to the existing 512x256 assets, preserving custom planet hues via luminance modulation. The ?perf=1 overlay now includes exact version and loaded map counts. ?albedo=0 disables albedo; ?pbr=0 keeps the procedural fallback. Physical iPhone validation remains required.

Physical iPhone video confirmed alpha.8: visible but noisy Earth material and weak stellar corona. Alpha.9 passed Chromium but WebKit timed out waiting for all maps (run 45950436270). Alpha.10 separates continental-scale terrain from microdetail, smooths clouds and ocean normals, adds geological fractures to rocky worlds and a star corona, and gives slow WebKit integration tests a longer asset-loading window with diagnostics. Physical visual quality still needs owner review.

## V10 rebuilt on V9.8.1

The restoration branch starts at b18fd7f, before the emergency renderers and the V10 alphas. Its default planet and star materials use the V9 shader. The V10 normal-map retry, albedo detail, reaction anchors and textured recovery are carried over. Compact devices use a 256 px derivative of the original 28-layer asset pack. System selection and landing approach the lit hemisphere at a three-quarter angle.

On the public album planet, `?world=1` adds geography baked with the Natural World V2.2 module from the production repository. The material uses elevation, vegetation and accumulated drainage. `?identity=preview` also blends a demonstration palette using the model's transition field. Run `node tools/bake-album-world.mjs` to rebuild the 128 KiB map. The V9 geometry and listener progression remain authoritative. This preview contains no unreleased cover art. The procedural V10 renderer is available with `?renderer=procedural`.

The two browser integration cases exercise both modes, including the original texture pack, camera approach, loaded Blender maps and a displayed album frame. Physical iPhone rendering, screen-lock playback and multi-account behavior require separate validation.

## Alpha.14 — V9 visual baseline

The normal maps now require `?pbr=1` in the original renderer, and the new albedo maps additionally require `&albedo=1`. The V9 approach camera is restored by default; `?camera=lit` retains the experimental three-quarter view. Entering a new system resets automatic compact fallback so a failure in one system does not downgrade subsequent systems. The compact mobile texture pack remains available, so this is not a pixel-identical V9 rollback. Browser integration scenarios separately test default and opt-in materials. Hardware review and CI are still pending at commit time.

## Alpha.15 — atlas diagnostics and comparison

`?atlas=mobile` selects the original 512 px mobile pack even at low effects quality; `?atlas=compact` selects the 256 px pack. Default selection is unchanged. Validate the pack header, unique names, ranges and resolution before decoding, stop decoding on failure, and check actual WebGL upload/mipmap errors before marking the atlas ready. Errors appear in the existing diagnostics. Added malformed-pack tests and 512 px integration coverage. CI and hardware results not yet verified.

## Alpha.16 — close-up relief experiment

`?depth=1` adds up to 25% optical terrain slope and increases terrain shadow attenuation close up, in both V9 shader paths. This is shading, not new mesh geometry. Replace the reversed-edge shadow smoothstep with defined GLSL math. Volcano height/normal and AO maps now have explicit load/upload status and GPU error checks; test serves the four actual PNG variants and requires ready status in the experimental scenario. Default depth remains unchanged. Browser and physical iPhone validation still pending.

## Alpha.17 — urban close-up experiment

`?city=1` enables distance-filtered facade frames, sill and story shading, roof tiles, solar-panel material details and road markings in the existing city98 renderer. Lot placement, city growth, building dimensions and saved worlds remain unchanged. The fallback renderer retains its previous city93 visuals. Source and integration checks cover flag isolation and uniform availability, not a visual city close-up or performance benchmark. Browser CI and physical iPhone review remain open.

## Alpha.18 — ocean and weather experiment

`?weather=1` adds three distance-filtered directional wave slopes in planet coordinates, bounded music/weather modulation of reflection roughness, shore foam, and cyclone spiral bands with eye and eyewall in both V9 shader variants. Corrected cyclone shadow offset to planet coordinates in preview. Existing cloud and city policies, planet geometry and saved geography are unchanged; no fluid simulation is introduced. Tests cover flag isolation and uniform availability, not actual weather appearance. Browser and physical device validation pending.
