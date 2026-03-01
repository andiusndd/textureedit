// ============================================
// PRE-INIT: Set willReadFrequently on all canvas
// contexts BEFORE OpenCV touches them.
// (First getContext() call wins per HTML5 spec)
// ============================================
['canvasAlbedo', 'canvasTiling'].forEach(id => {
    const c = document.getElementById(id);
    if (c) c.getContext('2d', { willReadFrequently: true });
});

// Global State
let isCvReady = false;
let sliderDebounceTimer = null;
let warpPoints = [
    { x: 0.1, y: 0.1 }, // TL
    { x: 0.9, y: 0.1 }, // TR
    { x: 0.9, y: 0.9 }, // BR
    { x: 0.1, y: 0.9 }  // BL
];
let activeWarpPt = null;

// DOM Elements
const uploadInput = document.getElementById('imageUpload');
const sourceImage = document.getElementById('sourceImage');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const workspaceTitle = document.getElementById('workspaceTitle');
const canvasCropPreview = document.getElementById('canvasCropPreview');
const warpContainer = document.getElementById('warpContainer');
const warpPolygon = document.getElementById('warpPolygon');

// OpenCv Loading Callback
function onOpenCvReady() {
    isCvReady = true;
    document.getElementById('engine-status').innerText = 'Engine Ready [OpenCV.js Loaded]';
    document.getElementById('engine-status-dot').style.background = '#22C55E';
    document.getElementById('engine-status-dot').style.boxShadow = '0 0 10px #22C55E';
}

const MAX_MP = 25 * 1000000;

// ===== CROP TAB UPLOAD =====
function handleCropUpload(file) {
    if (!file) return;
    if (!isCvReady) { alert("Please wait for OpenCV.js to finish loading."); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
        sourceImage.src = event.target.result;
        sourceImage.onload = () => {
            const mp = sourceImage.naturalWidth * sourceImage.naturalHeight;
            if (mp > MAX_MP) { alert(`Image too large (${(mp/1000000).toFixed(1)}MP). Max 25MP.`); return; }
            uploadPlaceholder.style.display = 'none';
            warpContainer.style.display = 'block';
            document.getElementById('downloadCropBtn').style.display = 'none';
            const maxDisplaySize = 800;
            const ratio = Math.min(1, maxDisplaySize / Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight));
            canvasCropPreview.width = sourceImage.naturalWidth * ratio;
            canvasCropPreview.height = sourceImage.naturalHeight * ratio;
            canvasCropPreview.getContext('2d').drawImage(sourceImage, 0, 0, canvasCropPreview.width, canvasCropPreview.height);
            warpContainer.style.width = canvasCropPreview.width + 'px';
            warpContainer.style.height = canvasCropPreview.height + 'px';
            updateWarpUI();
            document.getElementById('engine-status').innerText = 'Ready for Perspective Crop';
        };
    };
    reader.readAsDataURL(file);
}

// ===== DELIGHT TAB UPLOAD =====
function handleDelightUpload(file) {
    if (!file) return;
    if (!isCvReady) { alert("Please wait for OpenCV.js to finish loading."); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
        sourceImage.src = evt.target.result;
        sourceImage.onload = () => {
            const mp = sourceImage.naturalWidth * sourceImage.naturalHeight;
            if (mp > MAX_MP) { alert(`Image too large (${(mp/1000000).toFixed(1)}MP). Max 25MP.`); return; }
            document.getElementById('delightUploadPlaceholder').style.display = 'none';
            sourceImage.style.display = 'block';
            document.getElementById('engine-status').innerText = 'Processing...';
            document.getElementById('engine-status-dot').style.background = '#F59E0B';
            setTimeout(() => {
                processImageToMaps(sourceImage);
                document.getElementById('engine-status').innerText = 'Engine Ready';
                document.getElementById('engine-status-dot').style.background = '#22C55E';
                document.getElementById('saveAlbedoBtnWrap').style.display = 'flex';
            }, 50);
        };
    };
    reader.readAsDataURL(file);
}

// ===== TILING TAB UPLOAD =====
function handleTilingUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
            const mp = img.width * img.height;
            if (mp > MAX_MP) { alert(`Image too large (${(mp/1000000).toFixed(1)}MP). Max 25MP.`); return; }
            const albedoCanvas = document.getElementById('canvasAlbedo');
            albedoCanvas.width = img.width;
            albedoCanvas.height = img.height;
            albedoCanvas.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
            albedoCanvas.style.display = 'block';
            // Also keep sourceImage in sync for potential further steps
            sourceImage.src = evt.target.result;
            sourceImage.style.display = 'block';
            document.getElementById('saveAlbedoBtnWrap').style.display = 'flex';
            document.getElementById('engine-status').innerText = 'Image loaded';
            updateTilingPreview();
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
}

// Wire up each dedicated file input
uploadInput.addEventListener('change', (e) => handleCropUpload(e.target.files[0]));

document.getElementById('delightImageUpload').addEventListener('change', (e) => handleDelightUpload(e.target.files[0]));
document.getElementById('tilingImageUpload').addEventListener('change', (e) => handleTilingUpload(e.target.files[0]));

// Drag & Drop on the Crop viewport
const cropViewport = document.getElementById('cropViewport');
if (cropViewport) {
    cropViewport.addEventListener('dragover', (e) => { e.preventDefault(); cropViewport.style.borderColor = 'var(--accent)'; });
    cropViewport.addEventListener('dragleave', () => { cropViewport.style.borderColor = ''; });
    cropViewport.addEventListener('drop', (e) => {
        e.preventDefault(); cropViewport.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleCropUpload(file);
    });
}

// Drag & Drop on the Delight viewport
const viewportArea = document.getElementById('viewportArea');
if (viewportArea) {
    viewportArea.addEventListener('dragover', (e) => { e.preventDefault(); viewportArea.style.borderColor = 'var(--accent)'; });
    viewportArea.addEventListener('dragleave', () => { viewportArea.style.borderColor = ''; });
    viewportArea.addEventListener('drop', (e) => {
        e.preventDefault(); viewportArea.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleDelightUpload(file);
    });
}




// Save Maps Logic
const saveAlbedoBtnWrap = document.getElementById('saveAlbedoBtnWrap');

function saveCanvasAsPNG(canvasId, suffix) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || canvas.width === 0) return;

    let filename = `texture_${suffix}.png`;
    if (uploadInput.files && uploadInput.files.length > 0) {
        const orig = uploadInput.files[0].name;
        const base = orig.substring(0, orig.lastIndexOf('.')) || orig;
        filename = `${base}_${suffix}.png`;
    }

    // Convert canvas to Blob
    canvas.toBlob(async (blob) => {
        // PRIMARY: Use showSaveFilePicker (bypasses IDM & download managers completely)
        if (window.showSaveFilePicker) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'PNG Image',
                        accept: { 'image/png': ['.png'] }
                    }]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                return; // Done!
            } catch (err) {
                if (err.name === 'AbortError') return; // User cancelled
                console.warn('showSaveFilePicker failed, falling back:', err);
            }
        }

        // FALLBACK: Direct object URL (for older browsers / non-Chrome)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, 'image/png');
}

document.getElementById('saveAlbedoBtn').addEventListener('click', () => saveCanvasAsPNG('canvasAlbedo', 'albedo'));

const blurSlider = document.getElementById('blurSlider');
const blurValue = document.getElementById('blurValue');
const intensitySlider = document.getElementById('intensitySlider');
const intensityValue = document.getElementById('intensityValue');

// Slider Logic
function handleSliderChange() {
    blurValue.innerText = blurSlider.value;
    intensityValue.innerText = intensitySlider.value;

    if (sourceImage.naturalWidth > 0 && sourceImage.style.display !== 'none') {
        document.getElementById('engine-status').innerText = 'Updating...';
        document.getElementById('engine-status-dot').style.background = '#F59E0B';
        clearTimeout(sliderDebounceTimer);
        sliderDebounceTimer = setTimeout(() => {
            processImageToMaps(sourceImage);
            document.getElementById('engine-status').innerText = 'Engine Ready';
            document.getElementById('engine-status-dot').style.background = '#22C55E';
            saveAlbedoBtnWrap.style.display = 'flex';
            updateTilingPreview();
        }, 280);
    }
}

blurSlider.addEventListener('input', handleSliderChange);
intensitySlider.addEventListener('input', handleSliderChange);

// ─── Delight Mode Toggle ──────────────────────────────────────────────────────
const delightModeDescs = {
    v1: 'Multi-scale frequency separation. Best for textures with small, even lighting differences.',
    v2: 'Lab-space Multi-Scale Retinex + CLAHE. Best for strong directional light or large brightness gradients.'
};
const delightModeLabels = {
    v1: 'ALBEDO · DELIGHT 1',
    v2: 'ALBEDO · DELIGHT 2'
};

document.querySelectorAll('.delight-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Toggle active
        document.querySelectorAll('.delight-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.dataset.mode;

        // Update description + map label
        const descEl = document.getElementById('delightModeDesc');
        if (descEl) descEl.textContent = delightModeDescs[mode];
        const labelEl = document.getElementById('albedoMapLabel');
        if (labelEl) labelEl.textContent = delightModeLabels[mode];

        // Re-process if image already loaded
        if (sourceImage.naturalWidth > 0 && sourceImage.style.display !== 'none') {
            document.getElementById('engine-status').innerText = 'Processing...';
            document.getElementById('engine-status-dot').style.background = '#F59E0B';
            setTimeout(() => {
                processImageToMaps(sourceImage);
                document.getElementById('engine-status').innerText = 'Engine Ready';
                document.getElementById('engine-status-dot').style.background = '#22C55E';
                saveAlbedoBtnWrap.style.display = 'flex';
                updateTilingPreview();
            }, 50);
        }
    });
});

// Navigation is now anchor-based (landing page scroll).
// No tab-switching JS needed.

// ==========================================
// PERSPECTIVE CROP LOGIC
// ==========================================
function updateWarpUI() {
    const pts = ['ptTL', 'ptTR', 'ptBR', 'ptBL'];
    let polyPoints = "";
    
    pts.forEach((id, i) => {
        const el = document.getElementById(id);
        const px = warpPoints[i].x * canvasCropPreview.width;
        const py = warpPoints[i].y * canvasCropPreview.height;
        el.style.left = px + 'px';
        el.style.top = py + 'px';
        polyPoints += `${px},${py} `;
    });
    
    warpPolygon.setAttribute('points', polyPoints.trim());
}

function handleWarpMove(e) {
    if (!activeWarpPt) return;
    const rect = warpContainer.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    const idx = ['ptTL', 'ptTR', 'ptBR', 'ptBL'].indexOf(activeWarpPt.id);
    warpPoints[idx] = { x, y };
    updateWarpUI();
}

['ptTL', 'ptTR', 'ptBR', 'ptBL'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('mousedown', (e) => {
        activeWarpPt = el;
        e.stopPropagation();
    });
});

window.addEventListener('mousemove', handleWarpMove);
window.addEventListener('mouseup', () => { activeWarpPt = null; });

document.getElementById('applyWarpBtn').addEventListener('click', () => {
    document.getElementById('engine-status').innerText = 'Warping...';
    setTimeout(() => {
        const warpedCanvas = document.createElement('canvas');
        applyPerspectiveWarp(sourceImage, warpPoints, warpedCanvas);
        
        // Store the warped canvas so download works
        warpedCanvas.id = 'tempWarpedCanvas';
        const existing = document.getElementById('tempWarpedCanvas');
        if (existing) existing.remove();
        warpedCanvas.style.display = 'none';
        document.body.appendChild(warpedCanvas);
        
        document.getElementById('downloadCropBtn').style.display = 'inline-flex';

        // Set as source image for Delight and scroll there
        sourceImage.src = warpedCanvas.toDataURL();
        sourceImage.onload = () => {
            document.getElementById('delightUploadPlaceholder').style.display = 'none';
            sourceImage.style.display = 'block';
            processImageToMaps(sourceImage);
            document.getElementById('saveAlbedoBtnWrap').style.display = 'flex';
            document.getElementById('engine-status').innerText = 'Engine Ready';
            document.getElementById('engine-status-dot').style.background = '#22C55E';
            // Scroll to delight section
            document.getElementById('delightView').scrollIntoView({ behavior: 'smooth' });
        };
    }, 50);
});

// Download the warped crop result
document.getElementById('downloadCropBtn').addEventListener('click', async () => {
    const warpedCanvas = document.getElementById('tempWarpedCanvas');
    if (!warpedCanvas) { alert('Apply warp first.'); return; }
    warpedCanvas.toBlob(async (blob) => {
        const filename = 'cropped_texture.png';
        if (window.showSaveFilePicker) {
            try {
                const fh = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'PNG', accept: { 'image/png': ['.png'] } }] });
                const w = await fh.createWritable();
                await w.write(blob); await w.close(); return;
            } catch (err) { if (err.name === 'AbortError') return; }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, 'image/png');
});

// Apply Delight -> re-run processing on current image
document.getElementById('applyDelightBtn').addEventListener('click', () => {
    if (!isCvReady) {
        alert('Please wait for OpenCV.js to finish loading.');
        return;
    }
    if (sourceImage.naturalWidth === 0 || sourceImage.style.display === 'none') {
        document.getElementById('delightImageUpload').click();
        return;
    }
    document.getElementById('engine-status').innerText = 'Processing...';
    document.getElementById('engine-status-dot').style.background = '#F59E0B';
    setTimeout(() => {
        processImageToMaps(sourceImage);
        document.getElementById('engine-status').innerText = 'Engine Ready';
        document.getElementById('engine-status-dot').style.background = '#22C55E';
        saveAlbedoBtnWrap.style.display = 'flex';
    }, 50);
});

// ==========================================
// TILING & SEAMLESS LOGIC
// ==========================================
const canvasTiling = document.getElementById('canvasTiling');
const tilingPlaceholder = document.getElementById('tilingPlaceholder');
const runAutoSeamlessBtn = document.getElementById('runAutoSeamlessBtn');
const tilingViewport = document.getElementById('tilingViewport');
const gridCountSelect = document.getElementById('gridCount');
const showGridLinesCheck = document.getElementById('showGridLines');
const overlapSlider = document.getElementById('overlapSlider');
const overlapValue = document.getElementById('overlapValue');

let currentTilingMode = 'repeat'; // 'repeat' or 'mirror'
let tilingZoom = 1.0;
let tilingPanX = 0;
let tilingPanY = 0;
let isPanning = false;
let panStartX = 0, panStartY = 0, panStartOffX = 0, panStartOffY = 0;

// ─── Transform helpers ──────────────────────────────────────────────────────

/** Push the current pan+zoom state to the canvas element via CSS transform. */
function applyTilingTransform() {
    if (!canvasTiling) return;
    canvasTiling.style.transform = `translate(${tilingPanX}px, ${tilingPanY}px) scale(${tilingZoom})`;
    const pct = Math.round(tilingZoom * 100);
    const el = document.getElementById('zoomDisplay');
    if (el) el.textContent = `${pct}%`;
}

/**
 * Set zoom level. When pivotX/pivotY are supplied (client coords), the canvas
 * point currently under the cursor stays fixed — i.e. "zoom follows mouse".
 */
function setTilingZoom(newZoom, pivotClientX, pivotClientY) {
    if (!canvasTiling || canvasTiling.width === 0) return;

    const prevZoom = tilingZoom;
    tilingZoom = Math.min(Math.max(0.05, newZoom), 10.0);

    if (pivotClientX !== undefined && tilingViewport) {
        const rect = tilingViewport.getBoundingClientRect();
        // Mouse position relative to the viewport element
        const vpX = pivotClientX - rect.left;
        const vpY = pivotClientY - rect.top;
        // Which canvas-space pixel was under the cursor?
        const canvasX = (vpX - tilingPanX) / prevZoom;
        const canvasY = (vpY - tilingPanY) / prevZoom;
        // After the new zoom, adjust pan so the same pixel is still under the cursor
        tilingPanX = vpX - canvasX * tilingZoom;
        tilingPanY = vpY - canvasY * tilingZoom;
    }

    applyTilingTransform();
}

/** Center the canvas in the viewport (pure pan math, works at any zoom). */
function centerTilingCanvas() {
    if (!tilingViewport || !canvasTiling || canvasTiling.width === 0) return;
    const vw = tilingViewport.clientWidth;
    const vh = tilingViewport.clientHeight;
    tilingPanX = (vw - canvasTiling.width  * tilingZoom) / 2;
    tilingPanY = (vh - canvasTiling.height * tilingZoom) / 2;
    applyTilingTransform();
}

/** Fit the whole canvas inside the viewport with a small margin, then center. */
function fitTilingToViewport() {
    if (!canvasTiling || canvasTiling.width === 0 || !tilingViewport) return;
    const vw = tilingViewport.clientWidth  - 32; // 16px margin each side
    const vh = tilingViewport.clientHeight - 32;
    tilingZoom = Math.min(Math.max(0.05, Math.min(vw / canvasTiling.width, vh / canvasTiling.height)), 10.0);
    centerTilingCanvas(); // centers and calls applyTilingTransform
}

// ─── Zoom toolbar buttons ──────────────────────────────────────────────────────
document.getElementById('zoomInBtn')?.addEventListener('click',  () => setTilingZoom(tilingZoom + 0.25));
document.getElementById('zoomOutBtn')?.addEventListener('click', () => setTilingZoom(tilingZoom - 0.25));
document.getElementById('fitViewBtn')?.addEventListener('click', () => fitTilingToViewport());
document.getElementById('zoom100Btn')?.addEventListener('click', () => setTilingZoom(1.0));
document.getElementById('centerBtn')?.addEventListener('click',  () => centerTilingCanvas());

// ─── Keyboard shortcuts (active when page focused or tiling section visible) ─
document.addEventListener('keydown', (e) => {
    // Only fire when NOT typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    // Only fire when tiling section is roughly in view
    if (!tilingViewport) return;
    const rect = tilingViewport.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;

    if (e.key === '+' || e.key === '=') { e.preventDefault(); setTilingZoom(tilingZoom + 0.25); }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); setTilingZoom(tilingZoom - 0.25); }
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fitTilingToViewport(); }
    if (e.key === 'c' || e.key === 'C') { e.preventDefault(); centerTilingCanvas(); }
    if (e.key === '1')                  { e.preventDefault(); setTilingZoom(1.0); }
    if (e.key === '2')                  { e.preventDefault(); setTilingZoom(2.0); }
    if (e.key === '0')                  { e.preventDefault(); fitTilingToViewport(); }
});

// ─── Mode Switching ───────────────────────────────────────────────────────────
document.getElementById('modeRepeat').addEventListener('click', () => {
    currentTilingMode = 'repeat';
    document.getElementById('modeRepeat').classList.add('active');
    document.getElementById('modeMirror').classList.remove('active');
    updateTilingPreview();
});

document.getElementById('modeMirror').addEventListener('click', () => {
    currentTilingMode = 'mirror';
    document.getElementById('modeMirror').classList.add('active');
    document.getElementById('modeRepeat').classList.remove('active');
    updateTilingPreview();
});

// ─── Mouse Wheel Zoom (follows cursor) ─────────────────────────────────────────
if (tilingViewport) {
    tilingViewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        // Exponential feel: multiplicative factor per scroll tick
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        setTilingZoom(tilingZoom * factor, e.clientX, e.clientY);
    }, { passive: false });

    // ─── Click-drag Pan ────────────────────────────────────────────────
    tilingViewport.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isPanning = true;
        tilingViewport.style.cursor = 'grabbing';
        panStartX   = e.clientX;
        panStartY   = e.clientY;
        panStartOffX = tilingPanX;
        panStartOffY = tilingPanY;
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        tilingPanX = panStartOffX + (e.clientX - panStartX);
        tilingPanY = panStartOffY + (e.clientY - panStartY);
        applyTilingTransform();
    });

    window.addEventListener('mouseup', () => {
        if (!isPanning) return;
        isPanning = false;
        tilingViewport.style.cursor = 'grab';
    });
}

// ─── Controls sync ────────────────────────────────────────────────────────────
// Overlap slider: update value text (overlap only affects generate algorithms, not preview grid)
if (overlapSlider) {
    overlapSlider.addEventListener('input', () => {
        overlapValue.innerText = `${overlapSlider.value}%`;
    });
}

// Grid count and grid lines → update preview immediately
gridCountSelect.addEventListener('change', updateTilingPreview);
showGridLinesCheck.addEventListener('change', updateTilingPreview);

runAutoSeamlessBtn.addEventListener('click', () => {
    const albedoCanvas = document.getElementById('canvasAlbedo');
    if (!albedoCanvas || albedoCanvas.width === 0) {
        alert("Upload and process an image in DELIGHT tab first.");
        return;
    }

    runAutoSeamlessBtn.innerHTML = '<i class="ph ph-spinner"></i> PROCESSING...';
    runAutoSeamlessBtn.disabled = true;

    setTimeout(() => {
        try {
            // Use temp canvas to avoid same-canvas read/write conflict
            const tmpCanvas = document.createElement('canvas');
            const overlap = parseInt(overlapSlider?.value || 10);
            const mode = document.getElementById('seamlessMode').value;
            
            if (mode === 'graphcut') {
                generateGraphCutSeamless(albedoCanvas, tmpCanvas, overlap);
                document.getElementById('engine-status').innerText = 'Graph-Cut Quilting Applied';
            } else {
                generateSeamlessCrossfade(albedoCanvas, tmpCanvas, overlap);
                document.getElementById('engine-status').innerText = 'Crossfade Seamless Applied';
            }
            
            // Safe copy back
            albedoCanvas.width  = tmpCanvas.width;
            albedoCanvas.height = tmpCanvas.height;
            albedoCanvas.getContext('2d', { willReadFrequently: true }).drawImage(tmpCanvas, 0, 0);

            document.getElementById('engine-status-dot').style.background = '#22C55E';
            updateTilingPreview();
            setTimeout(() => fitTilingToViewport(), 60);
        } catch(e) {
            console.error(e);
            alert("Error: " + e.message);
        }
        runAutoSeamlessBtn.innerHTML = '<i class="ph ph-magic-wand"></i> GENERATE SEAMLESS';
        runAutoSeamlessBtn.disabled = false;
    }, 50);
});

// Rotate Blend
const runRotateBlendBtn = document.getElementById('runRotateBlendBtn');
runRotateBlendBtn.addEventListener('click', () => {
    const albedoCanvas = document.getElementById('canvasAlbedo');
    if (!albedoCanvas || albedoCanvas.width === 0) {
        alert("Upload and process an image in DELIGHT tab first.");
        return;
    }

    runRotateBlendBtn.innerHTML = '⏳ BLENDING...';
    runRotateBlendBtn.disabled = true;

    // Use a temp canvas so we don't overwrite source while reading
    const tmpCanvas = document.createElement('canvas');
    setTimeout(() => {
        try {
            generateRotateBlend(albedoCanvas, tmpCanvas);
            // Copy result back to albedoCanvas
            albedoCanvas.width = tmpCanvas.width;
            albedoCanvas.height = tmpCanvas.height;
            albedoCanvas.getContext('2d', { willReadFrequently: true })
                .drawImage(tmpCanvas, 0, 0);

            document.getElementById('engine-status').innerText = 'Rotate Blend Applied';
            document.getElementById('engine-status-dot').style.background = '#22C55E';
            updateTilingPreview();
            setTimeout(() => fitTilingToViewport(), 60);
        } catch(e) {
            console.error(e);
            alert("Error: " + e.message);
        }
        runRotateBlendBtn.innerHTML = '↻ ROTATE BLEND';
        runRotateBlendBtn.disabled = false;
    }, 50);
});

function updateTilingPreview() {
    const albedoCanvas = document.getElementById('canvasAlbedo');
    if (!albedoCanvas || albedoCanvas.style.display === 'none' || albedoCanvas.width === 0) {
        tilingPlaceholder.style.display = 'block';
        canvasTiling.style.display = 'none';
        return;
    }

    tilingPlaceholder.style.display = 'none';
    canvasTiling.style.display = 'block';

    const ctx = canvasTiling.getContext('2d', { willReadFrequently: true });
    const w = albedoCanvas.width;
    const h = albedoCanvas.height;
    const gridCount = parseInt(gridCountSelect.value);

    // Limit render size for performance (e.g. 1024px per tile max)
    const maxTileSize = 1024;
    let factor = 1.0;
    if (w > maxTileSize || h > maxTileSize) {
        factor = Math.min(maxTileSize / w, maxTileSize / h);
    }

    const sw = Math.floor(w * factor);
    const sh = Math.floor(h * factor);

    canvasTiling.width = sw * gridCount;
    canvasTiling.height = sh * gridCount;

    // Reset transform state for fresh render (fit will recalculate below)
    tilingZoom = 1.0;
    tilingPanX = 0;
    tilingPanY = 0;
    canvasTiling.style.width  = '';   // Let transform-scale control visual size
    canvasTiling.style.height = '';
    canvasTiling.style.transform = `translate(0px, 0px) scale(1)`;

    for (let i = 0; i < gridCount; i++) {
        for (let j = 0; j < gridCount; j++) {
            if (currentTilingMode === 'mirror') {
                ctx.save();
                const mirrorX = (i % 2 !== 0);
                const mirrorY = (j % 2 !== 0);
                ctx.translate(i * sw + (mirrorX ? sw : 0), j * sh + (mirrorY ? sh : 0));
                ctx.scale(mirrorX ? -1 : 1, mirrorY ? -1 : 1);
                ctx.drawImage(albedoCanvas, 0, 0, w, h, 0, 0, sw, sh);
                ctx.restore();
            } else {
                ctx.drawImage(albedoCanvas, 0, 0, w, h, i * sw, j * sh, sw, sh);
            }
        }
    }

    // Draw Grid Lines if enabled
    if (showGridLinesCheck.checked) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 1; i < gridCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * sw, 0);
            ctx.lineTo(i * sw, canvasTiling.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * sh);
            ctx.lineTo(canvasTiling.width, i * sh);
            ctx.stroke();
        }
    }
    // Update tile-info display in the toolbar
    const infoEl = document.getElementById('tilingInfo');
    if (infoEl) infoEl.textContent = `${sw}×${sh} px · ${gridCount}×${gridCount} grid`;

    // Auto-fit on every fresh render (zoom resets to 1:1 after a new grid is drawn,
    // then fit so the full grid is always visible without scrolling)
    setTimeout(() => fitTilingToViewport(), 0);
}

// Export Tiling
document.getElementById('exportTilingBtn')?.addEventListener('click', async () => {
    if (!canvasTiling || canvasTiling.style.display === 'none' || canvasTiling.width === 0) {
        alert("Process a texture in DELIGHT tab first.");
        return;
    }

    let filename = 'texture_3x3_tiled.png';
    if (uploadInput.files && uploadInput.files.length > 0) {
        const orig = uploadInput.files[0].name;
        const base = orig.substring(0, orig.lastIndexOf('.')) || orig;
        filename = `${base}_3x3_tiled.png`;
    }

    canvasTiling.toBlob(async (blob) => {
        if (window.showSaveFilePicker) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }
        // Fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, 'image/png');
});



