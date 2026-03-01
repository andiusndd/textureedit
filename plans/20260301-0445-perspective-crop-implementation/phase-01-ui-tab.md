# Phase 1: UI & Tab Structure
**Date**: 2026-03-01
**Priority**: High
**Status**: Pending

## Overview
Adds a new "1. CROP & WARP" tab to the application that intercepts uploaded images before they proceed to DELIGHT processing.

## Requirements
- Add a new Header Nav Item `1. CROP & WARP` and rename DELIGHT to `2. DELIGHT` and TILING to `3. TILING 3x3`.
- By default, uploads land on CROP & WARP.
- A central canvas `canvasCropper` is displayed under this view.
- A floating toolbar in this space containing: `APPLY WARP` and `SKIP`.

## Modification Files
- `index.html`
- `css/style.css`

## Implementation Steps
1. Insert `#cropView` section in `index.html`.
2. Update the header navigation items.
3. Update standard CSS styles for the new view layout.
4. Modify `handleFileUpload` in `main.js` to automatically redirect users to the CROP tab on successful upload.
