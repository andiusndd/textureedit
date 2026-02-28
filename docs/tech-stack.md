# Tech Stack for TextureEdit MVP (100% Client-Side)

## Architecture
- **Approach**: Pure Client-Side application (No Backend Server).
- **Benefit**: Zero server cost, infinite scalability, immediate processing zero network latency for image uploads/downloads, easily deployable as a static site.

## Frontend & Core Processing
- **Structure**: HTML5
- **Styling**: Vanilla CSS (Tailwind CSS via CDN can be added if UI needs rapid styling, but keeping it vanilla for KISS).
- **Interactivity & Logic**: Vanilla JavaScript (ES6+)
- **Image Processing**: OpenCV.js (WebAssembly port of OpenCV). Used for running delighting algorithms and generating Normal/Roughness maps directly in the browser via CPU/WebGL.
- **3D Rendering**: Three.js (via CDN). Used to render a 3D preview of the generated maps dynamically without downloading them.

## Deployment / Cross-Platform
- **Web App**: GitHub Pages, Vercel, or Cloudflare Pages (Free tier static hosting).
- **Desktop/Mobile**: Can be packaged as a PWA (Progressive Web App) or wrapped in WebView/Capacitor/Electron in the future.
