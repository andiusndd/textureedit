# Phase 3: 3D Preview Integration (Three.js)

## Overview
- **Date**: 2026-02-28
- **Priority**: High
- **Status**: Not Started

## Requirements
- Real-time 3D rendering of the generated textures.
- Use `CanvasTexture` to read directly from the processing output without saving files.

## Architecture
- `js/viewer3d.js` - Three.js setup and interaction.

## Implementation Steps
1. Initialize Three.js WebGLRenderer, Scene, PerspectiveCamera.
2. Add AmbientLight and a DirectionalLight. Add OrbitControls for user interaction.
3. Create a default geometry (e.g., `THREE.SphereGeometry` or `THREE.BoxGeometry`).
4. Initialize a `THREE.MeshStandardMaterial`.
5. When Phase 2 finishes processing, create `THREE.CanvasTexture` from the generated `<canvas>` elements.
6. Assign `material.map` (Albedo), `material.normalMap` (Normal), and `material.roughnessMap` (Roughness).
7. Call `material.needsUpdate = true`.

## Todo list
- [ ] Setup Basic Three.js Scene and render loop.
- [ ] Add OrbitControls.
- [ ] Link `CanvasTexture` to OpenCV output canvases.
- [ ] Update Material upon image processing completion.

## Success Criteria
- The 3D view shows a sphere dynamically reacting to the new PBR maps derived directly from the user's uploaded 2D image.
