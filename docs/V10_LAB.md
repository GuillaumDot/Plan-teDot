# PlanèteDot V10 — laboratoire

🤝 means the owner approves continuing development without intermediate approvals. Production activation remains gated on the owner's explicit final iPhone validation.

Alpha.1: independent sampler-free spherical WebGL2 shader, with procedural material colors, climate, atmosphere and an independent textured Canvas2D fallback. The isolated Chromium shader test passed for all 12 planet types (run 45930523650). This is not an end-to-end Safari test.

Alpha.2: optical relief lighting, cloud shadows, progressive procedural urban surface blocks, metallic and rocky strata, and distance-dependent detail. No true 3D buildings or meshes are activated yet. The dual-face palette is an experimental preview only, not actual cover artwork. Preserve private release assets. No database migration.

Acceptance: verify real app startup, user worlds, music and lock-screen playback, all planet types and close-up on iPhone, reactions, deterministic geometry, performance, and fallback. Do not merge or publish main before user validation. Existing GitHub Pages production is unchanged by this branch.

Alpha.3 added a pixel visibility watchdog and reaction anchors. Alpha.4 resolves multisample framebuffer probes via a reusable 2x2 single-sample target, restores framebuffer bindings, and separates probe failure from actual draw errors. CI includes a real MSAA regression; physical iPhone validation is still required.

Alpha.4 MSAA test failed on both browsers (10/11 passed each). Alpha.5 corrects the resolve rectangle to identical source/destination coordinates using the existing postprocessing framebuffer, without additional GPU memory. New run required.

Alpha.5 confirmed green on Chromium and WebKit (run 45948105599). The next CI gate exercises the actual application in an offline iPhone 13 viewport: boot, enter the built-in album system, land on the planet, and sample the final displayed frame. Its instrumentation exists only inside the test. It does not validate real accounts, audio assets or physical iPhone performance.
