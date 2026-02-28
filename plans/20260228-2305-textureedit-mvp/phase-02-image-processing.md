# Phase 2: Core Image Processing (OpenCV.js)

## Overview
- **Date**: 2026-02-28
- **Priority**: High
- **Status**: Not Started

## Requirements
- Process the source image using OpenCV.js matrix operations.
- Generate Delighted Albedo mapping.
- Generate Normal mapping (using Sobel/Scharr derivatives).
- Generate Roughness mapping (Grayscale + contrast adjustment).

## Architecture
- `js/processor.js` - Dedicated module/functions for handling `cv.Mat` operations.

## Implementation Steps
1. Create a function `processImage(sourceImageElement)` triggered after the image loads.
2. Read the image into a `cv.Mat`.
3. **Roughness Map**: Convert a clone to grayscale, invert it (optional depending on material), and apply threshold/contrast adjustments. Output to `#canvasRoughness`.
4. **Normal Map**: Convert to grayscale, apply `cv.Sobel` on X and Y axes, normalize, and combine into RGB channels (B=255, R=dx, G=dy). Output to `#canvasNormal`.
5. **Albedo/Delighting**: Apply a strong Gaussian Blur (High-pass filter trick) to create a light map, then divide the original image by the light map to flatten lighting. Output to `#canvasAlbedo`.
6. Ensure memory management (`mat.delete()`) to prevent memory leaks in the browser.

## Todo list
- [ ] Set up `cv.imread` and `cv.imshow`.
- [ ] Implement Normal Map logic.
- [ ] Implement Roughness Map logic.
- [ ] Implement Delighting (Albedo) logic.
- [ ] Add cleanup logic for cv.Mat variables.

## Success Criteria
- Uploading an image instantly populates the 3 respective 2D canvases with Albedo, Normal, and Roughness representations.
