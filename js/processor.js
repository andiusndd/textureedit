function processImageToMaps(imgElement) {
    if(!cv) return;
    
    // Read Original Image to Matrix
    let src = cv.imread(imgElement);
    
    // Process Albedo with dynamic slider values
    let blurValue = parseInt(document.getElementById('blurSlider').value);
    // Ensure blur kernel is odd
    if (blurValue % 2 === 0) blurValue += 1; 
    let intensityValue = parseFloat(document.getElementById('intensitySlider').value);

    generateAlbedoMap(src, 'canvasAlbedo', blurValue, intensityValue);

    // Cleanup src
    src.delete();
}

function generateAlbedoMap(srcMat, canvasId, blurValue, intensityValue) {
    let canvas = document.getElementById(canvasId);
    canvas.style.display = 'block';
    if(canvas.nextElementSibling) canvas.nextElementSibling.style.display = 'none';

    // 1. Calculate Average Color (Base Layer)
    let meanScalar = cv.mean(srcMat);
    let avgMap = new cv.Mat(srcMat.rows, srcMat.cols, srcMat.type(), meanScalar);

    // 2. High Pass Filter (Detail Layer)
    let blurred = new cv.Mat();
    let kernelSize = new cv.Size(blurValue, blurValue);
    cv.GaussianBlur(srcMat, blurred, kernelSize, 0, 0, cv.BORDER_DEFAULT);

    // HighPass = src - blurred + 128
    let highPass = new cv.Mat();
    let scalar128 = new cv.Mat(srcMat.rows, srcMat.cols, srcMat.type(), new cv.Scalar(128, 128, 128, 0));
    cv.subtract(srcMat, blurred, highPass); // HighPass might have negative values internally if we use float
    cv.add(highPass, scalar128, highPass);  // Shift to 128 neutral

    // 3. Linear Light Blending (Result = Base + 2*HighPass - 256)
    let floatAvg = new cv.Mat();
    let floatHighPass = new cv.Mat();
    avgMap.convertTo(floatAvg, cv.CV_32F);
    highPass.convertTo(floatHighPass, cv.CV_32F);

    let resultFloat = new cv.Mat();

    // Multiply HighPass by 2 * intensity
    // Standard Linear Light: Base + 2 * Detail - 256
    // Since we want to control detail strength, we'll scale the Detail part
    
    // Convert 128-centric HighPass to a range centering around 0
    let hpShifted = new cv.Mat();
    let float128 = new cv.Mat(srcMat.rows, srcMat.cols, cv.CV_32FC4, new cv.Scalar(128.0, 128.0, 128.0, 0));
    cv.subtract(floatHighPass, float128, hpShifted);

    // Scale the detail 
    let scaledHp = new cv.Mat();
    cv.multiply(hpShifted, new cv.Mat(srcMat.rows, srcMat.cols, cv.CV_32FC4, new cv.Scalar(2.0 * intensityValue, 2.0 * intensityValue, 2.0 * intensityValue, 0)), scaledHp);

    // Blend: Base + Scaled Detail
    cv.add(floatAvg, scaledHp, resultFloat);

    // Output Conversion
    let albedoMap = new cv.Mat();
    resultFloat.convertTo(albedoMap, cv.CV_8U);

    // Restore original alpha
    let rgbaPlanes = new cv.MatVector();
    let srcPlanes = new cv.MatVector();
    cv.split(albedoMap, rgbaPlanes);
    cv.split(srcMat, srcPlanes);
    srcPlanes.get(3).copyTo(rgbaPlanes.get(3));
    cv.merge(rgbaPlanes, albedoMap);

    cv.imshow(canvasId, albedoMap);

    // Cleanup
    avgMap.delete();
    blurred.delete();
    highPass.delete();
    scalar128.delete();
    floatAvg.delete();
    floatHighPass.delete();
    resultFloat.delete();
    hpShifted.delete();
    float128.delete();
    scaledHp.delete();
    rgbaPlanes.delete();
    srcPlanes.delete();
    albedoMap.delete();
}


