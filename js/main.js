// Global State
let isCvReady = false;

// DOM Elements
const uploadInput = document.getElementById('imageUpload');
const sourceImage = document.getElementById('sourceImage');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const workspaceTitle = document.getElementById('workspaceTitle');

// OpenCv Loading Callback
function onOpenCvReady() {
    isCvReady = true;
    document.getElementById('engine-status').innerText = 'Engine Ready [OpenCV.js Loaded]';
    document.getElementById('engine-status-dot').style.background = '#22C55E'; // Green
    document.getElementById('engine-status-dot').style.boxShadow = '0 0 10px #22C55E';
}

// File Upload Logic
uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isCvReady) {
        alert("Please wait for OpenCV.js to finish loading.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        // Show Image
        sourceImage.src = event.target.result;
        sourceImage.onload = () => {
            // Hide placeholder
            uploadPlaceholder.style.display = 'none';
            // Show original image
            sourceImage.style.display = 'block';

            // Start Processing
            document.getElementById('engine-status').innerText = 'Processing Image...';
            document.getElementById('engine-status-dot').style.background = '#F59E0B'; // Yellow
            
            // Run processing asynchronously to not freeze UI completely
            setTimeout(() => {
                processImageToMaps(sourceImage);
                document.getElementById('engine-status').innerText = 'Engine Ready';
                document.getElementById('engine-status-dot').style.background = '#22C55E';
            }, 50);
        };
    };
    reader.readAsDataURL(file);
});

// Slider Logic
const blurSlider = document.getElementById('blurSlider');
const blurValue = document.getElementById('blurValue');
const intensitySlider = document.getElementById('intensitySlider');
const intensityValue = document.getElementById('intensityValue');

function handleSliderChange() {
    blurValue.innerText = blurSlider.value;
    intensityValue.innerText = intensitySlider.value;
    
    if (sourceImage.src && sourceImage.style.display !== 'none') {
        document.getElementById('engine-status').innerText = 'Updating Delighting...';
        document.getElementById('engine-status-dot').style.background = '#F59E0B';
        setTimeout(() => {
            processImageToMaps(sourceImage);
            document.getElementById('engine-status').innerText = 'Engine Ready';
            document.getElementById('engine-status-dot').style.background = '#22C55E';
        }, 50);
    }
}

blurSlider.addEventListener('input', handleSliderChange);
intensitySlider.addEventListener('input', handleSliderChange);

// Export Logic
document.getElementById('exportBtn').addEventListener('click', () => {
    const canvas = document.getElementById('canvasAlbedo');
    if (!canvas || canvas.style.display === 'none') {
        alert("No texture to export! Please upload and process an image first.");
        return;
    }

    // Convert canvas to image and trigger download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Use original filename if possible, otherwise default
        let filename = "delighted_texture.png";
        if (uploadInput.files && uploadInput.files.length > 0) {
            const originalName = uploadInput.files[0].name;
            const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            filename = `${nameWithoutExt}_delighted.png`;
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }, 'image/png');
});
