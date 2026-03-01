function processImageToMaps(imgElement) {
    if(!cv) return;
    
    // Read Original Image to Matrix
    let src = cv.imread(imgElement);
    
    // Read slider values — ensure blur kernel is odd
    let blurValue = parseInt(document.getElementById('blurSlider').value);
    if (blurValue % 2 === 0) blurValue += 1;
    let intensityValue = parseFloat(document.getElementById('intensitySlider').value);

    // Dispatch to current delight mode (V1 = standard, V2 = high-contrast)
    const mode = document.querySelector('.delight-mode-btn.active')?.dataset.mode || 'v1';
    if (mode === 'v2') {
        let result = generateAlbedoMapV2(src, 'canvasAlbedo', blurValue, intensityValue);
        if (result) result.delete();
    } else {
        let albedoMat = generateAlbedoMap(src, 'canvasAlbedo', blurValue, intensityValue);
        if (albedoMat) albedoMat.delete();
    }

    src.delete();
}

function generateAlbedoMap(srcMat, canvasId, blurValue, intensityValue) {
    let canvas = document.getElementById(canvasId);
    canvas.style.display = 'block';
    if (canvas.nextElementSibling) canvas.nextElementSibling.style.display = 'none';

    // ── Multi-Scale Frequency Separation ────────────────────────────────────
    // Removes uneven lighting gradients at two frequencies simultaneously:
    //   COARSE blur (full radius)  → removes broad lighting ramps & shadows
    //   FINE   blur (1/3 radius)   → removes medium-scale luminance variation
    // Result = weighted blend of both high-freq ratios × scene neutral colour
    //
    // Math: ratio = src / blur (values ≈ 1.0 in neutrally-lit areas)
    //       output = ratio × neutral_color    (≈ 128 grey → correct CV_8U output)
    // NOTE: Do NOT scale by 1/128; that was the bug causing the black output.

    // ── 1. Compute two kernel sizes (both guaranteed odd) ───────────────────
    const kvCoarse = (blurValue % 2 === 0) ? blurValue + 1 : blurValue;
    const kvFineRaw = Math.max(11, Math.round(kvCoarse / 3.0));
    const kvFine   = (kvFineRaw % 2 === 0) ? kvFineRaw + 1 : kvFineRaw;

    // ── 2. Gaussian blurs (low-frequency illumination estimates) ────────────
    let lowCoarse = new cv.Mat();
    let lowFine   = new cv.Mat();
    cv.GaussianBlur(srcMat, lowCoarse, new cv.Size(kvCoarse, kvCoarse), 0, 0, cv.BORDER_REFLECT_101);
    cv.GaussianBlur(srcMat, lowFine,   new cv.Size(kvFine,   kvFine),   0, 0, cv.BORDER_REFLECT_101);

    // ── 3. Float conversion ─────────────────────────────────────────────────
    let srcFloat    = new cv.Mat();
    let lowCoarseF  = new cv.Mat();
    let lowFineF    = new cv.Mat();
    srcMat.convertTo(srcFloat,   cv.CV_32F);
    lowCoarse.convertTo(lowCoarseF, cv.CV_32F);
    lowFine.convertTo(lowFineF,     cv.CV_32F);

    // ── 4. Division ratios (add ε to prevent divide-by-zero) ────────────────
    let eps = new cv.Mat(srcMat.rows, srcMat.cols, cv.CV_32FC4, new cv.Scalar(1, 1, 1, 1));
    cv.add(lowCoarseF, eps, lowCoarseF);
    cv.add(lowFineF,   eps, lowFineF);

    let ratioCoarse = new cv.Mat();
    let ratioFine   = new cv.Mat();
    cv.divide(srcFloat, lowCoarseF, ratioCoarse);   // ≈ 1.0 in flat-lit areas
    cv.divide(srcFloat, lowFineF,   ratioFine);

    // ── 5. Blend ratios: 60% coarse (removes more lighting) + 40% fine ──────
    let blendedRatio = new cv.Mat();
    cv.addWeighted(ratioCoarse, 0.6, ratioFine, 0.4, 0.0, blendedRatio);

    // ── 6. Scene neutral colour ─────────────────────────────────────────────
    //    Mean of the coarse illumination layer ≈ the dominant scene light colour.
    //    intensity=1 → pure mid-grey (128 per channel, maximally flat albedo)
    //    intensity=0 → preserves original scene colour (no flattening)
    let meanScalar = cv.mean(lowCoarse);
    const t = intensityValue;  // shorthand
    let neutralMat = new cv.Mat(srcMat.rows, srcMat.cols, cv.CV_32FC4, new cv.Scalar(
        128 * t + meanScalar[0] * (1 - t),
        128 * t + meanScalar[1] * (1 - t),
        128 * t + meanScalar[2] * (1 - t),
        255
    ));

    // ── 7. Reconstruct: result = blendedRatio × neutralColour ───────────────
    //    blendedRatio ≈ 1.0     → result ≈ neutralColour (≈ 128) ✓
    //    blendedRatio < 1.0     → darker surface detail preserved ✓
    let resultFloat = new cv.Mat();
    cv.multiply(blendedRatio, neutralMat, resultFloat);   // ← NO /128 scale!

    // ── 8. Convert to 8-bit ─────────────────────────────────────────────────
    let albedoMap = new cv.Mat();
    resultFloat.convertTo(albedoMap, cv.CV_8U);

    // ── 9. Restore original alpha ────────────────────────────────────────────
    let albPlanes = new cv.MatVector();
    let srcPlanes = new cv.MatVector();
    cv.split(albedoMap, albPlanes);
    cv.split(srcMat,    srcPlanes);
    srcPlanes.get(3).copyTo(albPlanes.get(3));
    cv.merge(albPlanes, albedoMap);

    cv.imshow(canvasId, albedoMap);
    let resultClone = albedoMap.clone();

    // Cleanup
    lowCoarse.delete(); lowFine.delete();
    srcFloat.delete(); lowCoarseF.delete(); lowFineF.delete();
    eps.delete(); ratioCoarse.delete(); ratioFine.delete();
    blendedRatio.delete(); neutralMat.delete();
    resultFloat.delete(); albedoMap.delete();
    albPlanes.delete(); srcPlanes.delete();

    return resultClone;
}

/**
 * DELIGHT V2 — High-Contrast Lighting Removal
 * ─────────────────────────────────────────────────────────────────────────────
 * Designed for textures shot under strong directional light, gradient from
 * bright to dark side, or close-range illumination.
 *
 * Algorithm:
 *   1. RGBA → BGR → Lab (isolate L* luminance from colour)
 *   2. 4-scale Multi-Scale Retinex on L: ratio_k = L / blur_k, MSR = avg
 *   3. Normalize MSR → target brightness (compress highlights, lift shadows)
 *   4. CLAHE (clipLimit=2.5) for local contrast equalization
 *   5. Blend with original L via intensityValue
 *   6. Reconstruct Lab → BGR → RGBA, restore alpha
 */
function generateAlbedoMapV2(srcMat, canvasId, blurValue, intensityValue) {
    let canvas = document.getElementById(canvasId);
    canvas.style.display = 'block';
    if (canvas.nextElementSibling) canvas.nextElementSibling.style.display = 'none';

    // ── 1. RGBA ──▶ Lab ──────────────────────────────────────────────────────
    let bgr = new cv.Mat();
    cv.cvtColor(srcMat, bgr, cv.COLOR_RGBA2BGR);

    let lab = new cv.Mat();
    cv.cvtColor(bgr, lab, cv.COLOR_BGR2Lab);
    bgr.delete();

    let labPlanes = new cv.MatVector();
    cv.split(lab, labPlanes);
    let L8 = labPlanes.get(0);   // CV_8U Lab L* channel (0–255)

    // ── 2. Float L ───────────────────────────────────────────────────────────
    let Lf = new cv.Mat();
    L8.convertTo(Lf, cv.CV_32F);

    // ── 3. Build 4 kernel sizes (all odd, smallest ≥ 11) ────────────────────
    const makeOdd = v => (v % 2 === 0 ? v + 1 : v);
    const kvCoarse = makeOdd(blurValue);
    const kvXL     = makeOdd(Math.min(Math.round(kvCoarse * 2.5), 501));
    const kvMid    = makeOdd(Math.max(11, Math.round(kvCoarse / 2)));
    const kvFine   = makeOdd(Math.max(11, Math.round(kvCoarse / 5)));
    const scales   = [kvFine, kvMid, kvCoarse, kvXL];

    // ── 4. Multi-Scale Retinex on L (single-channel, no colour shift) ────────
    // Pre-allocate epsilon mat ONCE outside loop (avoids anonymous Mat leaks)
    let epsMat = new cv.Mat(Lf.rows, Lf.cols, cv.CV_32F, new cv.Scalar(1.0));
    let retinexSum = new cv.Mat(Lf.rows, Lf.cols, cv.CV_32F, new cv.Scalar(0));

    for (const kv of scales) {
        let blurMat = new cv.Mat();
        cv.GaussianBlur(Lf, blurMat, new cv.Size(kv, kv), 0, 0, cv.BORDER_REFLECT_101);

        let blurEps = new cv.Mat();
        cv.add(blurMat, epsMat, blurEps);   // ε prevents divide-by-zero
        blurMat.delete();

        let ratio = new cv.Mat();
        cv.divide(Lf, blurEps, ratio);      // ≈ 1.0 where lighting is neutral
        blurEps.delete();

        cv.add(retinexSum, ratio, retinexSum);
        ratio.delete();
    }
    epsMat.delete();

    // Average MSR across scales using cv.addWeighted scalar trick
    let msr = new cv.Mat();
    cv.addWeighted(retinexSum, 1.0 / scales.length, retinexSum, 0, 0, msr);
    retinexSum.delete();

    // ── 5. Normalize MSR → target brightness ─────────────────────────────────
    // msr ≈ 1.0 in neutral-light zones → multiply by target L value
    // At intensity=1.0: push to 128 (max flat / even lighting)
    // At intensity<1.0: blend toward original mean (softer effect)
    const meanL  = cv.mean(Lf)[0];
    const targetL = 128 * intensityValue + meanL * (1.0 - intensityValue);

    let msrScaled = new cv.Mat();
    cv.multiply(msr, msr, msrScaled, targetL);  // msrScaled = msr * msr * targetL
    // → This squares the ratio, making the correction much stronger for high-contrast
    msr.delete();

    // Clamp to [0, 255] and convert to 8-bit
    let msrNorm8 = new cv.Mat();
    msrScaled.convertTo(msrNorm8, cv.CV_8U);
    msrScaled.delete();

    // ── 6. Contrast Enhancement (CLAHE fallback) ─────────────────────────────
    // OpenCV.js default build often omits cv.createCLAHE.
    // Fallback: MSR already did most of the flattening. We'll add a gentle global
    // equalization and an unsharp mask to recover micro-contrast.
    let claheL = new cv.Mat();
    if (typeof cv.createCLAHE === 'function') {
        let clahe = cv.createCLAHE(2.5, new cv.Size(8, 8));
        clahe.apply(msrNorm8, claheL);
        clahe.delete();
    } else {
        let eqL = new cv.Mat();
        cv.equalizeHist(msrNorm8, eqL);
        // Blend Equalized (20%) + MSR (80%) to avoid harshness
        cv.addWeighted(msrNorm8, 0.8, eqL, 0.2, 0, claheL);
        eqL.delete();
    }
    msrNorm8.delete();

    // ── 7. Blend: intensity=1 → full delit, intensity=0 → original L ─────────
    let finalL = new cv.Mat();
    cv.addWeighted(claheL, intensityValue, L8, 1.0 - intensityValue, 0, finalL);
    claheL.delete();

    // ── 8. Reconstruct: put delit L back into Lab, convert to RGBA ───────────
    finalL.copyTo(labPlanes.get(0));
    finalL.delete();

    let labOut = new cv.Mat();
    cv.merge(labPlanes, labOut);
    lab.delete(); labPlanes.delete(); L8.delete(); Lf.delete();

    let bgrOut = new cv.Mat();
    cv.cvtColor(labOut, bgrOut, cv.COLOR_Lab2BGR);
    labOut.delete();

    let rgbaOut = new cv.Mat();
    cv.cvtColor(bgrOut, rgbaOut, cv.COLOR_BGR2RGBA);
    bgrOut.delete();

    // ── 9. Restore original alpha ─────────────────────────────────────────────
    let outPlanes = new cv.MatVector();
    let srcPlanes = new cv.MatVector();
    cv.split(rgbaOut, outPlanes);
    cv.split(srcMat,  srcPlanes);
    srcPlanes.get(3).copyTo(outPlanes.get(3));
    cv.merge(outPlanes, rgbaOut);
    outPlanes.delete(); srcPlanes.delete();

    cv.imshow(canvasId, rgbaOut);
    let resultClone = rgbaOut.clone();
    rgbaOut.delete();

    return resultClone;
}

/**
 * OPTION A: Organic Wandering Seam Seamless
 * Crops overlapping borders and blends them using a wavy jigsaw-like seam line.
 * - Narrow blending band prevents "blurriness".
 * - Random wavy warp prevents straight lines and "uneven color" blocks.
 * @param {HTMLCanvasElement} srcCanvas 
 * @param {HTMLCanvasElement} destCanvas 
 * @param {number} overlapPercent - 1 to 50%
 */
function generateSeamlessCrossfade(srcCanvas, destCanvas, overlapPercent = 10) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    
    // Force overlap to be within 1% and 50%
    const pct = Math.max(1, Math.min(50, overlapPercent)) / 100;
    const ox = Math.floor(w * pct);
    const oy = Math.floor(h * pct);
    
    const nw = w - ox;
    const nh = h - oy;
    
    if (nw <= 0 || nh <= 0) return;

    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    const srcData = srcCtx.getImageData(0, 0, w, h).data;
    
    // Pass 1: Horizontal wrap (left and right edges) -> tmpData size: nw x h
    const tmpData = new Uint8ClampedArray(nw * h * 4);
    for (let y = 0; y < h; y++) {
        // Organic sinusoidal warp based on Y (shifts the boundary left/right)
        const warpX = Math.sin(y * 0.05 + Math.cos(y * 0.01)) * (ox * 0.25);
        const centerX = (ox / 2) + warpX;
        
        // Narrow transition width to prevent blurriness (50% of overlap zone)
        const widthX = ox * 0.5;

        for (let x = 0; x < nw; x++) {
            const di = (y * nw + x) * 4;
            if (x < ox) {
                const si1 = (y * w + x) * 4;        // Texture 1 (overlapping on top)
                const si2 = (y * w + (x + nw)) * 4; // Texture 2 (underneath)
                
                // Map x to a sharp transitioned alpha [0..1]
                let t = (x - (centerX - widthX / 2)) / widthX;
                t = Math.max(0, Math.min(1, t)); // clamp

                // Smoothstep easing for invisible transition
                const alpha = t * t * (3 - 2 * t);
                
                tmpData[di]     = srcData[si1] * alpha + srcData[si2] * (1 - alpha);
                tmpData[di + 1] = srcData[si1 + 1] * alpha + srcData[si2 + 1] * (1 - alpha);
                tmpData[di + 2] = srcData[si1 + 2] * alpha + srcData[si2 + 2] * (1 - alpha);
                tmpData[di + 3] = srcData[si1 + 3] * alpha + srcData[si2 + 3] * (1 - alpha);
            } else {
                const si = (y * w + x) * 4;
                tmpData[di]     = srcData[si];
                tmpData[di + 1] = srcData[si + 1];
                tmpData[di + 2] = srcData[si + 2];
                tmpData[di + 3] = srcData[si + 3];
            }
        }
    }
    
    // Pass 2: Vertical wrap (top and bottom edges) -> outData size: nw x nh
    const outData = new Uint8ClampedArray(nw * nh * 4);
    for (let y = 0; y < nh; y++) {
        for (let x = 0; x < nw; x++) {
            const di = (y * nw + x) * 4;
            if (y < oy) {
                // Organic sinusoidal warp based on X (shifts the boundary up/down)
                const warpY = Math.sin(x * 0.05 + Math.cos(x * 0.01)) * (oy * 0.25);
                const centerY = (oy / 2) + warpY;
                const widthY = oy * 0.5;

                const si1 = (y * nw + x) * 4;
                const si2 = ((y + nh) * nw + x) * 4;
                
                let t = (y - (centerY - widthY / 2)) / widthY;
                t = Math.max(0, Math.min(1, t));

                const alpha = t * t * (3 - 2 * t);
                
                outData[di]     = tmpData[si1] * alpha + tmpData[si2] * (1 - alpha);
                outData[di + 1] = tmpData[si1 + 1] * alpha + tmpData[si2 + 1] * (1 - alpha);
                outData[di + 2] = tmpData[si1 + 2] * alpha + tmpData[si2 + 2] * (1 - alpha);
                outData[di + 3] = tmpData[si1 + 3] * alpha + tmpData[si2 + 3] * (1 - alpha);
            } else {
                const si = (y * nw + x) * 4;
                outData[di]     = tmpData[si];
                outData[di + 1] = tmpData[si + 1];
                outData[di + 2] = tmpData[si + 2];
                outData[di + 3] = tmpData[si + 3];
            }
        }
    }
    
    destCanvas.width = nw;
    destCanvas.height = nh;
    const destCtx = destCanvas.getContext('2d', { willReadFrequently: true });
    destCtx.putImageData(new ImageData(outData, nw, nh), 0, 0);
}

/**
 * OPTION B: Image Quilting (Graph-Cut Minimal Error Boundary)
 * Finds the path of least visual difference between the two overlapping edges using Dynamic Programming.
 * Produces much sharper seams than crossfade without blurring the material structures.
 */
function generateGraphCutSeamless(srcCanvas, destCanvas, overlapPercent = 10) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    
    // Force overlap to be within 1% and 50%
    const pct = Math.max(1, Math.min(50, overlapPercent)) / 100;
    const ox = Math.floor(w * pct);
    const oy = Math.floor(h * pct);
    
    const nw = w - ox;
    const nh = h - oy;
    
    if (nw <= 0 || nh <= 0) return;

    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    const srcData = srcCtx.getImageData(0, 0, w, h).data;
    
    // Pass 1: Horizontal wrap (left and right edges) -> tmpData size: nw x h
    const tmpData = new Uint8ClampedArray(nw * h * 4);
    
    let costs = new Float32Array(ox * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < ox; x++) {
            let si1 = (y * w + x) * 4;
            let si2 = (y * w + (x + nw)) * 4;
            let diffR = srcData[si1] - srcData[si2];
            let diffG = srcData[si1+1] - srcData[si2+1];
            let diffB = srcData[si1+2] - srcData[si2+2];
            costs[y * ox + x] = diffR*diffR + diffG*diffG + diffB*diffB;
        }
    }
    
    let minCost = new Float32Array(ox * h);
    let paths = new Int32Array(ox * h); 
    
    for(let x=0; x<ox; x++) minCost[x] = costs[x];
    
    for (let y = 1; y < h; y++) {
        for (let x = 0; x < ox; x++) {
            let left = x > 0 ? minCost[(y-1)*ox + (x-1)] : Infinity;
            let up = minCost[(y-1)*ox + x];
            let right = x < ox - 1 ? minCost[(y-1)*ox + (x+1)] : Infinity;
            
            let minVal = up;
            let minDir = x;
            if (left < minVal) { minVal = left; minDir = x - 1; }
            if (right < minVal) { minVal = right; minDir = x + 1; }
            
            minCost[y*ox + x] = costs[y*ox + x] + minVal;
            paths[y*ox + x] = minDir;
        }
    }
    
    let seam = new Int32Array(h);
    let minBottomCost = Infinity;
    let minBottomIndex = 0;
    for (let x=0; x<ox; x++) {
        if (minCost[(h-1)*ox + x] < minBottomCost) {
            minBottomCost = minCost[(h-1)*ox + x];
            minBottomIndex = x;
        }
    }
    seam[h-1] = minBottomIndex;
    for (let y=h-1; y>=1; y--) {
        seam[y-1] = paths[y*ox + seam[y]];
    }
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < nw; x++) {
            let di = (y * nw + x) * 4;
            if (x < ox) {
                let si1 = (y * w + x) * 4;       
                let si2 = (y * w + (x + nw)) * 4; 
                
                let dist = x - seam[y];
                if (dist < -1) {
                    tmpData[di]   = srcData[si2]; tmpData[di+1] = srcData[si2+1];
                    tmpData[di+2] = srcData[si2+2]; tmpData[di+3] = srcData[si2+3];
                } else if (dist > 1) {
                    tmpData[di]   = srcData[si1]; tmpData[di+1] = srcData[si1+1];
                    tmpData[di+2] = srcData[si1+2]; tmpData[di+3] = srcData[si1+3];
                } else {
                    let alpha = (dist + 2) / 4.0;
                    tmpData[di]   = srcData[si1]*alpha + srcData[si2]*(1-alpha);
                    tmpData[di+1] = srcData[si1+1]*alpha + srcData[si2+1]*(1-alpha);
                    tmpData[di+2] = srcData[si1+2]*alpha + srcData[si2+2]*(1-alpha);
                    tmpData[di+3] = srcData[si1+3]*alpha + srcData[si2+3]*(1-alpha);
                }
            } else {
                let si = (y * w + x) * 4;
                tmpData[di]   = srcData[si]; tmpData[di+1] = srcData[si+1];
                tmpData[di+2] = srcData[si+2]; tmpData[di+3] = srcData[si+3];
            }
        }
    }
    
    // Pass 2: Vertical wrap (top and bottom edges) -> outData size: nw x nh
    const outData = new Uint8ClampedArray(nw * nh * 4);
    
    let costsY = new Float32Array(nw * oy);
    for (let y = 0; y < oy; y++) {
        for (let x = 0; x < nw; x++) {
            let si1 = (y * nw + x) * 4; 
            let si2 = ((y + nh) * nw + x) * 4; 
            let diffR = tmpData[si1] - tmpData[si2];
            let diffG = tmpData[si1+1] - tmpData[si2+1];
            let diffB = tmpData[si1+2] - tmpData[si2+2];
            costsY[y * nw + x] = diffR*diffR + diffG*diffG + diffB*diffB;
        }
    }
    
    let minCostY = new Float32Array(nw * oy);
    let pathsY = new Int32Array(nw * oy); 
    
    for(let y=0; y<oy; y++) minCostY[y*nw] = costsY[y*nw];
    
    for (let x = 1; x < nw; x++) {
        for (let y = 0; y < oy; y++) {
            let up = y > 0 ? minCostY[(y-1)*nw + (x-1)] : Infinity;
            let straight = minCostY[y*nw + (x-1)];
            let down = y < oy - 1 ? minCostY[(y+1)*nw + (x-1)] : Infinity;
            
            let minVal = straight;
            let minDir = y;
            if (up < minVal) { minVal = up; minDir = y - 1; }
            if (down < minVal) { minVal = down; minDir = y + 1; }
            
            minCostY[y*nw + x] = costsY[y*nw + x] + minVal;
            pathsY[y*nw + x] = minDir;
        }
    }
    
    let seamY = new Int32Array(nw);
    let minRightCost = Infinity;
    let minRightIndex = 0;
    for (let y=0; y<oy; y++) {
        if (minCostY[y*nw + (nw-1)] < minRightCost) {
            minRightCost = minCostY[y*nw + (nw-1)];
            minRightIndex = y;
        }
    }
    seamY[nw-1] = minRightIndex;
    for (let x=nw-1; x>=1; x--) {
        seamY[x-1] = pathsY[seamY[x]*nw + x];
    }
    
    for (let y = 0; y < nh; y++) {
        for (let x = 0; x < nw; x++) {
            let di = (y * nw + x) * 4;
            if (y < oy) {
                let si1 = (y * nw + x) * 4;
                let si2 = ((y + nh) * nw + x) * 4; 
                let dist = y - seamY[x];
                if (dist < -1) {
                    outData[di]   = tmpData[si2]; outData[di+1] = tmpData[si2+1];
                    outData[di+2] = tmpData[si2+2]; outData[di+3] = tmpData[si2+3];
                } else if (dist > 1) {
                    outData[di]   = tmpData[si1]; outData[di+1] = tmpData[si1+1];
                    outData[di+2] = tmpData[si1+2]; outData[di+3] = tmpData[si1+3];
                } else {
                    let alpha = (dist + 2) / 4.0; 
                    outData[di]   = tmpData[si1]*alpha + tmpData[si2]*(1-alpha);
                    outData[di+1] = tmpData[si1+1]*alpha + tmpData[si2+1]*(1-alpha);
                    outData[di+2] = tmpData[si1+2]*alpha + tmpData[si2+2]*(1-alpha);
                    outData[di+3] = tmpData[si1+3]*alpha + tmpData[si2+3]*(1-alpha);
                }
            } else {
                let si = (y * nw + x) * 4;
                outData[di]   = tmpData[si]; outData[di+1] = tmpData[si+1];
                outData[di+2] = tmpData[si+2]; outData[di+3] = tmpData[si+3];
            }
        }
    }
    
    destCanvas.width = nw;
    destCanvas.height = nh;
    const destCtx = destCanvas.getContext('2d', { willReadFrequently: true });
    destCtx.putImageData(new ImageData(outData, nw, nh), 0, 0);
}

/**
 * OPTION D: Rotate & Average Blend
 * Blends 4 rotated copies (0°, 90°, 180°, 270°) into one averaged image.
 * Eliminates directional bias and tiling artifacts for organic textures.
 * @param {HTMLCanvasElement} srcCanvas 
 * @param {HTMLCanvasElement} destCanvas 
 */
function generateRotateBlend(srcCanvas, destCanvas) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;

    const transforms = [
        { scaleX: 1, scaleY: 1 },
        { scaleX: -1, scaleY: 1 },
        { scaleX: 1, scaleY: -1 },
        { scaleX: -1, scaleY: -1 }
    ];

    const rotatedPixels = transforms.map((t) => {
        const tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        const ctx = tmp.getContext('2d', { willReadFrequently: true });
        ctx.save();
        ctx.translate(t.scaleX === -1 ? w : 0, t.scaleY === -1 ? h : 0);
        ctx.scale(t.scaleX, t.scaleY);
        ctx.drawImage(srcCanvas, 0, 0, w, h);
        ctx.restore();
        return ctx.getImageData(0, 0, w, h).data;
    });

    // Pixel-level average of all 4 rotations
    const result = new Uint8ClampedArray(w * h * 4);
    const n = rotatedPixels.length;
    for (let i = 0; i < result.length; i += 4) {
        result[i]     = Math.round(rotatedPixels.reduce((s, p) => s + p[i],     0) / n);
        result[i + 1] = Math.round(rotatedPixels.reduce((s, p) => s + p[i + 1], 0) / n);
        result[i + 2] = Math.round(rotatedPixels.reduce((s, p) => s + p[i + 2], 0) / n);
        result[i + 3] = 255;
    }

    destCanvas.width = w; destCanvas.height = h;
    destCanvas.getContext('2d', { willReadFrequently: true })
        .putImageData(new ImageData(result, w, h), 0, 0);
}
/**
 * PERSPECTIVE WARP: Corrects camera tilt/angle
 * Transforms a quad region into a squared texture.
 * @param {HTMLImageElement|HTMLCanvasElement} srcImg 
 * @param {Array} pts - Array of 4 normalized points {x, y}
 * @param {HTMLCanvasElement} destCanvas 
 */
function applyPerspectiveWarp(srcImg, pts, destCanvas) {
    if (!cv) return;

    let src = cv.imread(srcImg);
    const w = srcImg.naturalWidth || srcImg.width;
    const h = srcImg.naturalHeight || srcImg.height;

    // Convert normalized points to pixel coordinates
    // pts order: [TL, TR, BR, BL]
    const px = pts.map(p => ({ x: p.x * w, y: p.y * h }));

    // Compute natural output dimensions from the quad edge lengths (preserve aspect ratio)
    const topW    = Math.hypot(px[1].x - px[0].x, px[1].y - px[0].y);
    const bottomW = Math.hypot(px[2].x - px[3].x, px[2].y - px[3].y);
    const leftH   = Math.hypot(px[3].x - px[0].x, px[3].y - px[0].y);
    const rightH  = Math.hypot(px[2].x - px[1].x, px[2].y - px[1].y);

    let outW = Math.round((topW + bottomW) / 2);
    let outH = Math.round((leftH + rightH) / 2);

    // Cap at 2048 on the longer side while preserving ratio
    const maxDim = 2048;
    const scaleFactor = Math.min(1, maxDim / Math.max(outW, outH, 1));
    outW = Math.max(1, Math.round(outW * scaleFactor));
    outH = Math.max(1, Math.round(outH * scaleFactor));

    destCanvas.width  = outW;
    destCanvas.height = outH;

    let srcPtsData = [
        px[0].x, px[0].y,
        px[1].x, px[1].y,
        px[2].x, px[2].y,
        px[3].x, px[3].y
    ];

    let dstPtsData = [
        0,    0,
        outW, 0,
        outW, outH,
        0,    outH
    ];

    let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, srcPtsData);
    let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, dstPtsData);

    let M = cv.getPerspectiveTransform(srcCoords, dstCoords);
    let dsize = new cv.Size(outW, outH);

    cv.warpPerspective(src, src, M, dsize, cv.INTER_LANCZOS4, cv.BORDER_CONSTANT, new cv.Scalar());

    cv.imshow(destCanvas, src);

    // Cleanup
    src.delete();
    srcCoords.delete();
    dstCoords.delete();
    M.delete();
}

