# MORPHOSPACE 64

Offline-compatible, self-contained WebGL artificial-life specimen gallery.

- **Live website:** https://furuinu.github.io/morphospace/
- **App:** [index.html](index.html) — v15.11.0, Nano Capture & Parent Docking.
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

