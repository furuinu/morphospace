# MORPHOSPACE 64

Offline-compatible, static WebGL artificial-life specimen gallery with a same-origin About translation script.

- **Live website:** https://furuinu.github.io/morphospace/
- **App:** [index.html](index.html) — v15.78.2. **About translations:** [about-i18n.js](about-i18n.js).
- No installation, external APIs, CDN, or third-party network assets are needed. Supports touch rotation, camera orbit, inherited DNA and breeding, procedural colour, bioluminescence, captures, sharing and video recording.

## Visible status, sharpening and a quality control (v15.78.2)

A report from a physical device said depth of field made no visible difference and the picture looked soft overall. Both are consistent with the automatic quality control having stepped down: tiers 0 and 1 skipped depth of field, and tier 0 drew at 1.0x. This could not be reproduced without the device, so the release makes the state visible and removes the two penalties.

- **Status.** The settings panel now states whether depth of field is running (`動作中　強さ N%`), waiting for a closer zoom, switched off, paused, or unavailable on the device with the reason. A second line states the render quality in use and whether it was chosen automatically.
- **Quality control.** A 品質 selector offers 自動, 高精細, 標準, 陰影なし and 軽量. A fixed choice overrides automatic adjustment and is remembered on the device.
- **Depth of field at every tier.** The user's switch now decides. Reduced tiers use 12 samples instead of 24.
- **Lowest tier.** Its render scale cap rises from 1.0 to 1.2.
- **Sharpening.** FXAA treated fine texture as edges and softened it. The edge threshold is higher, and pixels below it receive a luma-only unsharp step from the four taps already taken, limited to 0.07 so it cannot ring. Flat areas are unchanged. On a simulated 3x display at tier 2, mean luminance gradient over the body rose from 7.76 to 8.57.
- **Haze.** The far-side haze limit falls from 24% to 14%.

## Macro depth-of-field switch (v15.78.1)

The **マクロ被写界深度** checkbox was locked and off. It is now usable, on by default, and switches the zoom-driven depth of field on and off. The choice is remembered on the device. Shared links and stored views no longer set it, because every view saved while the box was locked carries `false`. The strength and focus sliders now update their readouts and the picture as they move.

## Rainbow motes and zoom depth of field (v15.78.0)

**Motes.** Each suspended mote now keeps one random hue from the full colour wheel, washed 44% to 66% of the way towards white, so the field reads as pale rainbow dust rather than a single blue-white tone. Position, size, blur and brightness are unchanged.

**Depth of field.** The depth-of-field pass, which had been compiled out, now runs from the zoom. It is absent at the default framing (zoom 55) and anything wider, and eases in to full strength at the closest zoom. Focus stays on the body centre, so tissue nearer and farther than the centre softens while the middle of the body stays sharp. The blur radius is defined for an 800-pixel-high picture, so it looks the same at every render scale. It follows contact shading and precedes bloom. The existing strength control scales it and zero turns it off. It is skipped for captures, wireframe and quality tiers 0 and 1. The sky is not blurred; it is already soft.

Validation: Node checks cover the zoom curve (zero at and below the default, monotonic and smooth above it), the skip conditions, the pass wiring and a CPU port of the mote tint (all six hue sectors occur; every tint stays bright and weakly saturated). Rendered at zoom 55, 80 and 100 in headless Chromium without WebGL errors. Frame rate with the pass active on a physical iPhone remains unverified.

## Adaptive quality, pattern filtering, surrounding medium and progressive open (v15.77.0)

**Adaptive quality.** Frame intervals now decide how much the device is asked to draw. There are four tiers:

| tier | render scale cap | contact shading |
|---|---|---|
| 3 | 2.0 | on |
| 2 (default, the previous behaviour) | 1.35 | on |
| 1 | 1.35 | off |
| 0 | 1.0 | off |

Windows of at least one second are averaged. Two consecutive windows slower than 22.5 ms step down; four faster than 18.5 ms step up. A tier that failed stays off limits for 20 s, doubling on each failure up to 10 minutes. Tier 3 is only tried where the display's pixel ratio exceeds 1.35. A steady 30 Hz that persists at the lowest tier is treated as a display cap (for example low-power mode) and returns to the default. Handoffs, captures, recordings, hidden tabs, the first 1.5 s after a change and single stalls over 250 ms are not measured. Recordings and captures keep the fixed 1.35 scale.

**Pattern filtering.** The comb-bead skin pattern has a period of two to three pixels at normal framing, so sampling it point-wise produced crawling dot noise. As a row or bead period approaches one pixel (from screen-space derivatives) its shape eases to its own mean coverage, and per-bead sparkle fades with it. WebGL2 always has derivatives; WebGL1 uses `OES_standard_derivatives` when present and is otherwise unchanged. The compatibility shader is not modified. Other pigment layers are not filtered.

**Surrounding medium.** The sky is rendered a second time into a 24 x 24 texture (without point stars). The body shader samples it at each pixel's screen position, which gives the soft local colour of the sky behind the body. That colour lights surfaces the lamps leave dark (faces turned from the key light and grazing rims) and replaces up to 24% of the colour on the far side of the body, by view depth relative to the body centre. Thumbnails keep the plain look. If the probe cannot be created a flat colour from the background profile is used.

**Progressive open.** Opening a specimen built its full-resolution body on the main thread. It now shows the low-lattice body at once and builds the full body in the Worker that already prepares transitions, swapping it in when it arrives while keeping framing, zoom and travel. A cached body opens directly. The swap waits for handoffs, captures and recordings, is dropped if the viewer has moved to another specimen, and falls back to a main-thread build if the Worker fails or is unavailable. Until the swap the body is visibly coarser and has no fine appendages.

Measured in headless Chromium (SwiftShader), two runs each: time to the ready gate fell from about 1.39 s to 0.61 s, and the longest main-thread task during boot from about 1.0 s to 0.28 s. The full body arrived about 2.4 s after navigation.

Validation: Node checks simulate the quality controller (climb, step down, penalty, 30 Hz cap, unmeasured frames), verify the pattern means numerically, bound the fallback medium colour, and drive the progressive open through success, cancellation, deferral and failure with a fake Worker. Shaders compile and render in headless Chromium without WebGL errors. Frame intervals under SwiftShader say nothing about real devices: the controller's behaviour on a physical iPhone, and the look of all four changes there, remain unverified.

## Centre lock and suspension (v15.76.0)

**Centre lock.** Outside a handoff the camera no longer lets the travelling organism wander inside a free-drift zone (10% of the view on each axis), and no longer uses look-ahead or a speed cap. The organism's travel position is held at the exact screen centre every frame. Whatever offset exists when the lock engages, for example the remainder of a handoff, decays over about 0.6 s, so engaging it never jumps the picture. Depth keeps its 3.5% tolerance so the breathing dolly is not fought. The handoff's own guided follow is unchanged.

**Suspension.** Three independent cues make the body read as hanging in a medium:

- *Buoyancy.* The body heaves (1.4% of the framing distance), sways (0.6%) and tilts (up to about 2 degrees per axis) about its own centre. Each specimen has its own phase.
- *Camera drift.* The camera shifts by about 1% of the framing distance and turns by less than half a degree on a slower rhythm than the body, so body, motes and sky move against each other.
- *Near-field motes.* 420 motes fill a world-periodic box around the body. They stay fixed in the world while the organism travels, so travel streams them past. Point size follows a thin-lens blur circle around the focal plane at the body: motes near the lens become large faint discs, those near the body stay small specks. They add light only, behind nearer tissue, and do not write depth or the emission mask.

All three share one gain that eases in and out over about a second. It is zero during handoffs, capture and laboratory sequences, isolated frames and when the system requests reduced motion. Thumbnails are never affected. Motion uses sums of three incommensurate sines, so it is smooth, bounded and has no visible loop.

Validation: Node checks cover the lock (exact centring under varying travel, no jump on engage or after a handoff), gain easing and its off conditions, rigid bounded buoyancy, bounded camera drift that is not correlated with the body, the mote wrap and GL state restoration. The cues render in headless Chromium (SwiftShader, WebGL2) without shader or WebGL errors. Physical iPhone appearance, comfort and frame rate remain unverified.

## Exact field acceleration and higher observation meshes (v15.75.0)

Building a body shell samples the growth field (`morphSDF`) on a lattice, and every sample used to evaluate every primitive. Two exact shortcuts now remove most of that work without changing any value that reaches the mesh.

- **Block plans.** The field unions primitives with `min(value,f)-blend`, and the blend is exactly zero once `f>=value+k`. For a lattice block each primitive gets a conservative lower and upper bound; a primitive whose lower bound clears the running upper bound by `k` cannot affect any sample in the block and is left out of that block's list. `morphSDF` takes the list as an optional argument and otherwise runs the same arithmetic in the same order.
- **Outside regions.** The lattice is split as an octree. A range whose lower bound is positive lies wholly outside the body and is not sampled; a node there is evaluated only if the surface or a normal later needs it. Child ranges test only the primitives their parent could not exclude.

Inputs the bounds do not cover (non-positive fuse or copy scale, degenerate axes, non-finite values) fall back to full evaluation.

Measured in Node over 24 seeded specimens (3 seeds x 8 styles), all meshes of the real build path:

| | build time per specimen | observation shell vertices |
|---|---|---|
| v15.74.0, lattice 47/43/41/37 | 3356 ms | 3666 mean, 10456 max |
| accelerated, same lattice | 679 ms, bit-identical meshes | unchanged |
| v15.75.0, lattice 71/67/63/59 | 1130 ms | 9508 mean, 24692 max |

The observation shell lattice rises from 47/43/41/37 to 71/67/63/59 by copy count. Thin lobes and ruffles that broke into detached shards at the old spacing now resolve as connected surfaces. Gallery (19) and transition (29 to 19) meshes keep their resolution and are bit-identical to v15.74.0; they are only built faster. The 60000-vertex budget and its step-down fallback are unchanged.

Validation: a property test compares planned and full field values at more than 15000 points for fused and source fields (bit-identical, and no block reported outside contains a non-positive sample); accelerated meshes equal a reference that samples every node; fallbacks are covered. Device build time and frame rate at the higher vertex count on a physical iPhone remain unverified.

## Contact shading and field-gradient normals (v15.74.0)

**Contact shading.** A screen-space ambient occlusion pass darkens folds, organ roots and overlapping lobes. It uses only the existing scene depth texture: each pixel rebuilds its view-space position and normal from depth, then ten spiral samples measure how much nearby geometry rises above its tangent plane. The estimate is computed at half resolution with four interleaved sample rotations, then filtered while it is multiplied into the scene colour. Alpha (the emission mask for bloom) and the empty background are left untouched. The reach is 7.5% of the framing distance, so it follows specimen size rather than zoom.

The existing **陰影の強さ** slider scales it together with surface shading; zero skips the pass. It runs on WebGL2 only (24-bit depth); WebGL1, wireframe and the capture/laboratory sequences render as before. Failure to create the pass leaves the scene unchanged.

**Normals.** Body-shell normals were averaged from the marching-tetrahedra triangles, whose irregular shapes show up in lighting and reflections. They now come from the growth field's gradient, interpolated from the lattice samples already taken for the surface, so no additional field evaluations are made and build time is unchanged. Where the gradient disagrees with the triangle normal (features thinner than the lattice) it fades back to the triangle normal. Positions, topology, colours and morph correspondence are unchanged.

Measured over 12 seeded bodies at the detailed resolution, mean normal error against the cell-scale field gradient fell from 30.6° to 25.1°, and mean normal variation across mesh edges from 30.2° to 28.2°. The improvement is modest: these bodies have many features near the lattice size, so resolution, not normal estimation, is the main limit on smoothness.

Validation: Node checks cover gradient adoption and fallback, unchanged positions/topology, pass wiring, state restoration and the WebGL2-only gate. Shaders compile and render in headless Chromium (SwiftShader, WebGL2). Physical iPhone Safari appearance and frame rate remain unverified.

## Edge antialiasing and dithering (v15.73.0)

The final composite now antialiases the scene with FXAA before flare, stellar point and VHS treatment, so film grain and scanlines stay crisp. Flat regions exit after five luma taps; only contrast edges take four more samples. No render target, pass or extension was added, and WebGL1 uses the same code. The DOF debug views bypass it.

The scene targets remain 8-bit. A fixed screen-space triangular dither of one 8-bit step is applied to the nebula/marine background before it is written to the scene target, and again at final output for bloom and flare gradients. Atlas thumbnails keep their noise-free backdrop. The pattern does not change over time, so stills and video frames are stable.

Validation: Node checks cover shader wiring, the debug bypass and a CPU port of the dither (bounded, zero-mean, disperses a three-level ramp). Both shader variants compile and render in headless Chromium (SwiftShader, WebGL2). Physical iPhone Safari appearance and frame rate remain unverified.

## Kinetic network and mirrored serial bodies (v15.67.0)

The seventh spatial grammar connects 3–5 mirrored segment pairs, each pair reusing the same ancestral source anatomy instead of constructing new bead primitives. Existing six layouts remain available. A small topology-aware motion network follows the actual copy centres: serial chains (including spiral), radiating networks, square groups and branch-like minimum spanning trees. Wave travel, folding/extension and short recoil events are combined from inheritable motion DNA; branch and skin motion continue to work independently. A bounded link-length correction and rigid copy matrices prevent uncontrolled joint separation without rebuilding the source mesh every frame. Disabling motion disables the new network as well. Archived genomes receive deterministic defaults for the new genes.

Validation: node pairing, deterministic networks, bounded inter-node distances and the legacy copy articulation regressions are checked in the Node test suite. Mobile Safari visual performance and complete capture-to-viewer transitions should be checked on-device.

## Full-screen specimen viewing

Tap a specimen in the atlas or saved-sample list to open the immersive, edge-to-edge 3D viewer by default. The upper-left **詳細** button switches to the inspector, where DNA, appearance controls, capture options and parent breeding controls remain accessible; **鑑賞へ** returns to the immersive view without changing individuals.

The upper-right **← 一覧** control returns to the atlas, restoring focus to the selected item where possible. The **‹ / ›** controls move between specimens with the existing morph transition and are positioned at the screen edges in the immersive view. **鑑賞設定** controls labels, automatic playback, sound and noise. Tapping the 3D view hides/shows controls; tapping outside the settings closes it. Escape closes settings first, then returns to the atlas. Responsive layout includes safe-area offsets on iPhone. Inspector appearance adjustments keep the current viewing mode.

## Capture, stock and breeding

**capture** saves the organism itself to browser-local IndexedDB before preparing its existing image card. The stock retains its full DNA, name, ecology, generation, parent IDs and display settings, with a small image preview. Capturing the same individual again updates it while preserving its first capture date.

Open **生体サンプルから親を選ぶ** in **DNA交配実験室**. Each stored organism can be opened in 3D or selected as parent A/B. **掛け合わせる → 子64体** generates a new generation using the existing crossover engine; both stored parents remain available. The current sample count is displayed in **DNA交配実験室**. The capture action uses an articulated manipulator icon. The selection of both parents survives a reload. Opening stock specimens leaves the generated gallery and its mesh cache intact. Stock grids use saved images rather than creating extra 3D meshes.

The stock is specific to the current browser and website origin; it is not synchronized between devices. Use **サンプルを書き出す** and **サンプルを読み込む** to keep or transfer a JSON archive. Import validates all records before one atomic merge, preserves unrelated stock and updates matching IDs. Files up to 32 MB and 2,000 records are accepted. Browser data deletion or private browsing can remove local storage. A failed write is reported with a retry action, never reported as a successful capture. Individual deletion requires confirmation and also clears matching parent selections.

## Nano capture and parent selection

Capture plays a 4.15-second dark-field sequence: the camera pulls back, a transparent suction probe approaches, the actual WebGL specimen is drawn toward its mouth, and a tiny floating capsule holds the saved organism. Parent A/B selection plays a 2.05-second capsule-to-ring loading sequence using the selected specimens' own images. When two different parents are present, a pulse follows the connecting capillary. There is no Petri dish, bench, external image asset or additional per-frame specimen mesh.

Both flows wait for their IndexedDB transaction to commit before showing success. Failed writes retain an error/retry path. Rapid repeated actions are ignored while the operation runs. The skip button shortens only the visuals; committed samples and parent choices remain saved. Camera, pan, automatic orbit, DOF and rig display restore on completion, skip, visibility interruption or context loss. System reduced-motion preference uses a brief final-state presentation.

The effects use one Canvas 2D compositor, capped at approximately 560,000 pixels and 30fps. Capture reuses the existing WebGL renderer; parent loading uses small cached or generated specimen previews. Portrait lays out the A/B holders vertically, landscape horizontally; safe-area insets keep the skip control usable on iPhone. Gallery thumbnail generation yields while the effects run, avoiding competing framebuffer resizes.

Validation includes stage ordering, portrait/landscape bounds, render projection under camera rotation, commit-before-success, repeated clicks, failed storage, skip and state restoration. Browser Canvas/IndexedDB flows were exercised with CPU specimen fixtures because the QA browser has no WebGL. Physical iPhone Safari and the complete GPU capture animation still need device verification.

## Chromatic Grammar

The 200 source triads remain unchanged. Six pigments are assigned by their actual colour contrast to eight distinct spatial grammars: mantle margins, reef panels, corolla rays, structural-colour armour, ocelli, branching veins, segmented belts and multicoloured colonies.

Pattern DNA and the existing category controls determine the grammar. Surface fields follow the principal developmental axis and growth nuclei, independent of mesh resolution. Standard and compatibility shaders share one colour implementation; gallery thumbnails use that same shader and release their temporary GPU meshes immediately. A fallback CPU preview remains available.

Previously saved DNA and shared links still load. This release interprets their colours using the new grammar, so their appearance changes while geometry, motion DNA, names and genealogy remain intact. Iridescence is an artistic reflectance approximation, separate from self-emission.

## Fresnel and structural colour

Each specimen has a deterministic pearl-film, beetle-layer, scale-interference or wet-film coating derived from its existing palette and pattern DNA. Schlick Fresnel reflectance strengthens the rim at grazing angles. Structural colour uses a three-wavelength thin-film approximation with Snell's transmitted angle, varying film thickness, coating coverage and roughness. This is an artistic optical approximation rather than a full spectral multilayer simulation.

The view vector follows the actual orbiting camera, including pan and mirrored geometry. Reflection is applied after diffuse lighting and before local self-emission. The **フレネル反射** and **構造色** sliders under **発光・陰影** independently scale the effects from 0–150%; their defaults are 100%, and zero disables the corresponding effect. Shared views preserve both controls. PNG and video output use the same material pipeline.

## Development

Run the dependency-free regression checks with Node.js:

```sh
node --test tests/*.test.cjs
```

Checks cover seeded colour determinism, all eight layouts, category controls, stable colour coordinates across mesh resolutions, unchanged geometry under recolouring, shared-link round trips, descendant palettes, thumbnail resource isolation, four deterministic coatings, inverse camera transforms and shared optical controls. Stock checks additionally cover full-record archive round trips, identical restored meshes and palettes, invalid imports, isolated specimen loading, commit-before-success behaviour and unavailable storage. The Pages workflow runs both test suites before publication.

The authoritative source is the root `index.html` on `main` in this public repository. `masala-generator` contains historical snapshots and is not the publication source.

## Multilingual About and script policy

The MORPHOSPACE **?** explanation dialog offers Japanese (default), English, Traditional Chinese (Taiwan), Korean, Simplified Chinese, French, Italian, German, Russian, Thai, Vietnamese, Portuguese and Spanish. This changes only the explanatory dialog, not the language of the underlying 3D application. The author credit is part of each translation. The selected language is stored locally when browser storage is available.

The original Japanese explanation and signature remain directly in `index.html` as a no-JavaScript fallback. Translations and selection logic live in the same-origin, static `about-i18n.js` file; no remote scripts, translation API, server processing or CDN is required. If the external file fails to load, the Japanese explanation remains readable and the language dropdown stays hidden.

GitHub Pages packages **both** `index.html` and `about-i18n.js`; its deployment workflow allows that one explicit local script path only and verifies syntax. Existing Pages workflow permissions remain limited to `contents: read`, `pages: write` and `id-token: write`.

### XServer mirror (only when independently hosted)

The repository cannot inspect or alter an existing server's private cron configuration. If an XServer site or historical scheduled pull is still in service, it must synchronize **both** the root `index.html` and `about-i18n.js`. Do not use an old “index.html only” copy job; do not fetch from `masala-generator`. Configure the existing server-side scheduled task to call the checked-in helper:

```sh
MORPHOSPACE_REPO_DIR=/absolute/path/to/morphospace \
MORPHOSPACE_DOCROOT=/absolute/path/to/public/document/root \
bash /absolute/path/to/morphospace/scripts/sync-xserver.sh
```

Supply the correct paths from the actual XServer account before enabling the job. The helper verifies the origin and `main` branch, performs `git pull --ff-only origin main`, and copies the dependent JavaScript **before** the updated HTML. It applies `0644` permissions to both web files, refuses to write to an unwritable document root, and requires the web document directory to be traversable. An app-owned document directory ordinarily uses `0755`; do not reset shared hosting directory ownership or permissions blindly. Both files must be accessible by the web-server user. Existing `data-bundled="voice-styles.js"` compatibility marker remains intact for historical XServer checks.

The helper is **not** invoked by GitHub Pages and is **not** automatically installed into an existing XServer cron job. XServer delivery must be checked separately after confirming the remote account configuration.

## Publishing

The **Deploy MORPHOSPACE to GitHub Pages** workflow publishes the root app when `main` changes. GitHub Pages must use **GitHub Actions** as its source. Each workflow run uploads its own uniquely named Pages artifact.


## Glass capture

Capture keeps the existing specimen mesh, materials, motion, marine snow and post effects. The camera pulls back before an open glass capillary enters from the right. The body deforms progressively at the capillary mouth and travels along the same tube, continuing offscreen; no capsule or replacement specimen image appears. The nine-second sequence supports skip and reduced motion. Storage commits before animation, and interruption restores the original view.

The probe is a cached hollow 3D mesh (outer wall, inner wall, annular lip) in the specimen WebGL render pass. Its transparent material samples the current scene for approximate refraction and adds Fresnel reflections after the background depth of field and before the existing lens/VHS effects. It uses one bounded scene-copy texture and no per-frame geometry allocation. This is an artistic glass approximation.

The micro capillary now has a narrow neck, smooth widening taper and a rounded lip with a 4.5% wall-to-radius ratio at the mouth. Refraction is subtle; narrow paired highlights define the clear glass. A separate premultiplied glass layer keeps the mouth in focus and softly defocuses the distant shaft without changing the background. The glass composite preserves the scene emission mask.

Approach uses a coarse move, slow fine adjustment and a short damped settling period before suction. A rising flow accelerates the body into the stationary capillary, then keeps it moving along the lumen without an artificial mid-transfer stop. Standard and compatibility specimen shaders apply the same inlet-local deformation; tissue outside the opening keeps its shape. This remains an artistic micromanipulation effect, not a fluid simulation or calibrated physical scale.

## Particle suction

The existing 960 world-space snow particles now respond to capture pressure. Only the local region upstream of the capillary mouth is attracted; nearby particles accelerate into the opening, and particles that enter follow the tube axis. Size-dependent velocity relaxation provides inertia, while the original slow ambient drift continues. Particles outside the influence region and behind the glass walls retain their ordinary drift.

A capture-only buffer carries the advected positions and velocity. The snow shader gives faster particles short directional streaks; the normal/depth passes use the same elongated footprint. Capture adds a fixed wider 3D survey volume, including the central region, so dolly-out reveals more particles. Ending or skipping the capture discards the flow state, and the ordinary buffer is unchanged. Physics uses small integration steps, with regression coverage at 30/60 fps. This is a local artistic flow approximation, not calibrated fluid dynamics.

## Portrait capture visibility fix

The previous particle shader faded to zero beyond a fixed 72 world-unit camera distance, so portrait capture framing and dolly-out could hide the entire flow. The original particle volume was also limited to 48 × 36 × 48 world units. Capture now uses a relative optical range, a slightly larger minimum point footprint and a fixed stratified volume containing 3,200 additional world-space particles. Offscreen particles become visible as the camera withdraws, while central additions fade in during the pullback; the total capture budget is bounded at 4,160 particles. The volume is generated once and does not follow the camera.

The original 960 particles remain unchanged. Both populations join the same inlet flow; the outer particles drift without periodic wrapping, and elapsed time is compensated at creation so a long-running session cannot move the survey volume away. Normal viewing retains its original particle count and optical behavior. Regression checks cover iPhone portrait/landscape ratios, monotonic visible-count growth during dolly-out, inlet transport and long-running sessions. Physical iPhone rendering still requires device confirmation.

## Particle-first timing and central density

Particle pressure starts at 3.35 seconds. The body retains its position and capture deformation until 4.15 seconds, allowing light particles to enter the lumen first. Body translation and inlet deformation then start together, with an extended total duration of 8.6 seconds. Its own existing biological motion continues throughout.

The survey volume uses a stratified distribution across the entire width and height, filling the center as well as the sides in landscape. Central additions fade in with camera pullback to prevent a sudden first-frame increase. Particle count and GPU layout remain unchanged. Tests verify that a particle crosses the mouth before body transport and that central landscape density is comparable to adjacent regions.

## Parent slot portraits

The main DNA laboratory, sample laboratory and inspector parent-registration buttons show compact specimen portraits alongside the parent label/name. Lab portraits are 32–36px and registration portraits are 28px. Images reuse saved sample previews or gallery thumbnails, with a cached 96px specimen render fallback. Replacing or clearing a parent cannot attach a stale async portrait to its slot; invalid saved previews fall back to regeneration. Full names/IDs remain in the slot title.

The two-branch glass-flow convergence runs when breeding parent A × parent B into 64 offspring, rather than on parent registration.

## 3D sample laboratory

- Registering the currently viewed organism as parent A/B plays micro-extraction: contact with a narrow glass probe, particles first, then a small 3D tissue sample that travels along the same tube. The original body remains and recovers from the local indentation. Tissue fragments use the parent palette, pattern seed and style; no capsule or thumbnail sprite is used.
- Choosing a parent from the sample archive plays release from the glass tube. Opening a sample in 3D uses the same release, leaving the actual restored organism in the inspector. Fluid exits first; the organism is compressed inside the lumen and regains its original shape as it emerges.
- Breeding shows two parent-colored 3D samples moving through a hollow Y-shaped glass junction, converging and traveling into the common channel. Only after the scene finishes or is skipped does the existing genetic algorithm generate the actual 64 children. Repeated clicks cannot generate duplicate collections, and navigation cancels pending generation.

All three scenes use the original WebGL material pipeline, glass refraction/Fresnel and background. Temporary archive previews detach and retain the real scene's GPU buffers, then restore them even after interruption. Transient tissue meshes are released at the end. The depth-of-field shader now receives the active projection's near/far range so pulled-back lab views retain correct focus. Without WebGL, the visual is skipped and parent selection/breeding remains available. These are artistic microscope effects rather than a biological procedure simulation.

Full-screen 3D viewing supports timed morph transitions, a pinch-synchronized zoom slider, and independent visibility for title, subtitle, organism name, scientific name, taxonomy, and ecology.

Tap the 3D canvas to hide or restore navigation in both normal and full-screen views (toolbar, zoom, close, capture/share and position status). Text visibility remains controlled by the viewing settings. Rotation drags, multi-touch gestures, cancelled pointers and long presses do not toggle navigation. Tapping outside the viewing settings closes the panel; that same tap does not hide the navigation. Opening another specimen restores the controls. The focused canvas also supports Enter/Space; Escape closes the settings before leaving full screen.

Full-screen video export preserves the stage aspect ratio, visible text overlays, zoom, and timed morph transitions. Controls are excluded; MP4 remains the preferred format with WebM fallback.

v15.13.10 keeps the existing capture/share actions available as compact buttons at the bottom right of full-screen viewing. The zoom slider and caption sit above them; position/transition status uses the remaining bottom-left space. These actions follow tap-to-hide navigation and reuse the existing capture/share flows. Zoom minus/plus are real, labeled buttons with five-point slider steps, synchronized camera distance and disabled limits in both normal and full-screen views. Zoom during morphing scales both endpoint distances together.

## Biotic activity sound (v15.13.15)

Viewing settings offer an explicit activity-sound start/stop button and a remembered volume slider. Audio is initially off and requires a button gesture. Each organism has deterministic sound DNA: timbre (pitch, cavity resonance, grains, membrane), recursive rhythm (cycle, depth, branching, decay), and response (lag, pressure sensitivity, phase, flutter). These blocks cross over and mutate with parent provenance. Legacy DNA receives stable defaults; audio DNA survives shared links and captured archives.

A bounded recursive pulse tree (at most 15 events per cycle) nests small pulses inside broad breaths, with seeded variation between cycles. Persistent sine, filtered membrane and filtered-noise sources respond to these pulses and tissue pressure/velocity. Audio parameters ramp smoothly. During morphs two complete voices crossfade; the incoming graph continues at adoption instead of restarting. No sound files, microphone access, or per-frame PCM generation are used.

Closing the viewer, hiding the page or an interrupted audio context stops sound and releases voices; resume requires the start button. Capture/stock dialogs and sample animations temporarily mute the output. A high-pass filter, compressor and bounded gains precede the speaker output. While sound is active, video recording adds a dedicated audio track and selects audio-capable MIME candidates. Recording cleanup detaches only its own destination, preserving listening audio. Exported audio follows the viewing volume.

Validation: 78 Node checks, including bounded/deterministic pulse trees, 40 generations of sound inheritance, share-link/legacy round trips, synthesis graph/pressure automation, morph voice reuse, hide/close/resume cancellation and recording-track cleanup. Audio graph tests use a Web Audio test double. Physical iPhone listening and MediaRecorder audio encoding remain unverified.

## Captured-only and random viewing (v15.13.13)

Viewing settings select the current gallery or captured specimens only. A persistent random-next checkbox applies to either collection, for timed playback and the next button; it excludes the current specimen. Previous remains sequential. The random target is selected once per prepared transition and remains stable throughout background generation and bounded uploads. Switching collections cancels stale preparation; captured-only selection refreshes browser storage and reports empty/error states without substituting gallery organisms.

The sample archive includes a direct viewing button that opens full-screen captured-only playback at a 10-second observation interval. Opening an individual saved sample also keeps navigation within captured specimens. A single capture stays on screen. Saved identity/DNA remains active after morph adoption and never overwrites the gallery population or detail cache. Opening a gallery specimen resets the collection to the gallery. Normal/full-screen viewing and existing full-screen video playback share this behavior.

Validation: 71 Node checks, including captured-only cycling/adoption/cache isolation, both random collections and stable preloads, one-capture handling, empty archives, stale asynchronous storage reads and source-change cancellation.

## Viewing effects (v15.13.11)

v15.13.12 moves the viewing toolbar outside the clipped 3D scene into the detail overlay's own stacking context, above the inspector, capture/share dock and close button. The settings panel can extend over the inspector without being cropped at the scene boundary. Its scroll height is bounded by the viewport, safe areas and the detail's maximum height. Existing outside-tap and Escape dismissal are preserved.

v15.13.11 adds a video-noise/glitch checkbox to viewing settings. It updates the live VHS composite immediately and remembers the preference locally. Video export initializes its existing VHS checkbox from that preference; its explicit recording choice applies for the recording and the live preference resumes afterwards. The initial default remains on.

## Inherited surface relationships (v15.13.9)

Adds a stable surface chromosome in three crossover blocks: material (grain/wrinkle/pore mixture, scale, depth), relationships (pigment coupling, temporal lag, drift), and identity (phase, direction, partial asymmetry). Blocks inherit a preferred parent, with bounded blending/mutation; this lineage is shown under biological information. Saved DNA, stock archives, share links and worker targets retain these fields. Legacy specimens derive deterministic defaults from their original seed.

An object-anchored procedural bump field changes lighting and structural reflections without adding triangles. Its analytic gradient avoids three finite-difference height samples. Pigment boundaries modulate relief density, slow normal displacement and emission intensity; wrinkle strain and local motion have inherited phase delays. Existing internal pressure modulates the small displacement. Mirrored copies share the broad silhouette but diverge locally in pigment placement, relief and motion. The existing internal pressure network remains in place; this does not introduce a new developmental simulation or new organ types.

Both original and target surface fields remain independent during morphs: finished materials crossfade and vertex displacements blend to the exact incoming endpoint. Ordinary draws reset surface uniforms. Motion-off freezes surface strain, while static relief remains visible. The 39-point detailed mesh grid and worker/upload budgets are unchanged.

Validation: 66 Node checks, including 40 generations of bounded surface inheritance, share-link/legacy round trips, resolution consistency and uniform resets; native GLES shader compile/link in both renderer modes and GLSL 300, rendered relief/asymmetry/frozen-motion checks, complete material blend endpoints, and three actual detailed mesh renders. iPhone Safari performance requires device confirmation.

## Texture transitions (v15.13.6)

Reverts the v15.13.5 geometry changes to the original 2.8-second shape morph and nearest-vertex preparation. Texture transitions evaluate the original and incoming pigment grammars, anatomical frames and optical coatings separately, then blend their finished colors with the existing quintic easing on every render frame. Categorical pattern/coating IDs, frequencies and phase are never interpolated. Normal specimen, thumbnail, capture and sample draws reset the second coating so it cannot leak into later scenes.

Validation: 53 Node regression checks, plus native GLES shader compilation and rendered endpoint/blend comparisons. Actual iPhone Safari performance still requires device confirmation.

## Prepared viewer transitions (v15.13.7)

v15.13.8 increases the detailed implicit mesh sampling grid from 35 to 39 (about 25% more surface triangles; measured about 26% across eight seeded organisms). The gallery grid remains 19. Detailed views, captures, videos and worker-prepared morph targets share the new resolution. Existing worker preparation and bounded GPU uploads remain active. Actual iPhone frame-rate impact requires device confirmation.

The next organism and the original nearest-vertex correspondence are computed in a dedicated Blob Worker while the current organism keeps animating. Only one pending transition is retained. CPU arrays are cloned on input and transferred back from the worker; the displayed buffers are never detached. GPU uploads are prepared over multiple frames, capped at 256 KiB and a 2 ms scheduling budget per frame, with 64 KiB transfer chunks. The existing 2.8-second morph starts once its target and transition buffers are ready.

At completion the viewer adopts the prepared target buffers directly. It does not regenerate geometry, rescan bounds, upload an unused final morph frame or synchronously delete the previous buffers. Old buffers are released gradually. Closing, reversing navigation, changing specimens and capture interruption cancel pending work and release partial allocations. Worker failures preserve the current scene and stop automatic switching, without silently moving expensive generation onto the rendering thread.

The incoming pressure simulation runs throughout the morph and its node/pressure uniforms blend into the active state. Source and target emission fields and blink modes are evaluated independently and cross-faded together with the texture; bloom tint and radius follow the same weight. Target motion energy also reaches its final value before adoption.

Validation includes a real worker event-loop heartbeat, exact target/correspondence hashes, bounded uploads and cancellation, zero geometry preparation/transfers at adoption, and pressure/light continuity. Native GLES checks cover both material renderers, cilia and GLSL 300, with rendered texture and emission endpoints. Physical iPhone Safari performance remains to be confirmed.
