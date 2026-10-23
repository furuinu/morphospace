# MORPHOSPACE 64

Offline-compatible, self-contained WebGL artificial-life specimen gallery.

- **Live website:** https://furuinu.github.io/morphospace/
- **App:** [index.html](index.html) — v15.13.6, Glass Sample Lab.
- No installation or external assets are needed. Supports touch rotation, camera orbit, inherited DNA and breeding, procedural colour, bioluminescence, captures, sharing and video recording.

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

## Texture transitions (v15.13.6)

Reverts the v15.13.5 geometry changes to the original 2.8-second shape morph and nearest-vertex preparation. Texture transitions evaluate the original and incoming pigment grammars, anatomical frames and optical coatings separately, then blend their finished colors with the existing quintic easing on every render frame. Categorical pattern/coating IDs, frequencies and phase are never interpolated. Normal specimen, thumbnail, capture and sample draws reset the second coating so it cannot leak into later scenes.

Validation: 53 Node regression checks, plus native GLES shader compilation and rendered endpoint/blend comparisons. Actual iPhone Safari performance still requires device confirmation.
