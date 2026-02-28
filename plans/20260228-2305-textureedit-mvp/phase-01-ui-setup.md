# Phase 1: UI Foundation & Library Setup

## Overview
- **Date**: 2026-02-28
- **Priority**: High
- **Status**: Not Started

## Requirements
- Basic layout setup (Left panel: Controls & 2D Previews, Right panel: 3D View).
- Load necessary external libraries (OpenCV.js, Three.js).
- Handle file upload and display the original image on a hidden or preview canvas.

## Architecture
- `index.html` - Core DOM structure.
- `css/style.css` - Layout and styling.
- `js/main.js` - Script to handle UI events and library initialization.

## Implementation Steps
1. Create `index.html` with sections for Image Upload, 2D Canvas Previews (Original, Albedo, Normal, Roughness), and a container for the 3D canvas.
2. Add CDN links for Three.js and OpenCV.js. Since OpenCV.js is heavy (~8MB), implement an `onload` callback to show a "Loading Engine..." UI until it's ready.
3. Write standard CSS flexbox/grid layout for the dashboard.
4. Implement standard file reader logic in JavaScript to load the user's uploaded image into an HTML `<img>` tag or `<canvas>`.

## Todo list
- [ ] Create HTML skeleton
- [ ] Add CSS layout
- [ ] Implement OpenCV.js async loader indicator
- [ ] Implement Image File uploader logic

## Success Criteria
- Page loads, shows a loading state for OpenCV.js, and then allows the user to select an image which renders onto the screen.
