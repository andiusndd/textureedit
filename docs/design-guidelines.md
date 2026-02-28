# Design Guidelines: TextureEdit

## 1. Aesthetic Direction: Modern Dark Glassmorphism 
Inspired by the clean, professional, and slightly moody vibe of the SKLUM dashboard. The design should utilize overlapping frosted glass elements against a dark, dynamic background.

## 2. Color Palette
- **Background**: Dynamic deep blue/navy ocean video or an abstract deep gradient (e.g. `#080C16` to `#111827`)
- **Card Background**: `rgba(255, 255, 255, 0.08)` -- Frosted glass effect.
- **Card Borders**: `rgba(255, 255, 255, 0.15)` -- Thin, translucent outlines highlighting shapes.
- **Primary Text**: Pure White `#FFFFFF`.
- **Secondary Text (Labels/Hint)**: Light Gray/Blueish `#94A3B8`.
- **Accents**: Subtle cyan/blue glows `#38BDF8` for active states or generated maps highlights.

## 3. Typography
- **Primary Font**: `Inter` (Google Fonts) for crisp, clean legibility.
- **Weights**: 
  - `400` (Regular) for normal text and map labels.
  - `600` (Semi-bold) for card titles and the main logo/brand text.
  - `700` (Bold) for large numeric values or main CTAs.
- **Sizes**:
  - H1/Brand: `24px`
  - Card Titles (e.g., 'ORIGINAL IMAGE'): `13px` with `2px` letter-spacing (uppercase).
  - Normal text: `14px`

## 4. Visual Elements (UI/UX)
- **Cards**: Large corner radius (`border-radius: 16px`), blurred backdrops (`backdrop-filter: blur(20px)`), and a soft box shadow.
- **Icons**: Phosphor Icons (or similar stroke-based icons) colored white with semi-opacity (`0.6`) when resting, full opacity on hover.
- **Layout Structure**:
  - **Top Navigation**: Fixed height (e.g., `80px`). Logo on the left (e.g. `TEXTURE  EDIT`), right-aligned action buttons (Export all, Dark/Light Mode toggle, etc).
  - **Main Area**: 
    - Full height minus header.
    - Two large glassmorphic cards in the center filling most of the screen.
    - **Left Card** (Workspace): Will hold the Image Uploader, Original Image Canvas, or the 3D Three.js Viewport.
    - **Right Card** (Results/Maps): Will display the 3 smaller generated results (Albedo, Normal, Roughness) stacked vertically or in a grid.

## 5. Interactions & States
- **Hover**: Cards should slightly brighten their background opacity (`rgba(255, 255, 255, 0.12)`) and borders.
- **Loading State (OpenCV)**: A sleek glowing spinner overlaying the glass cards while processing.

## 6. Implementation Notes
- Avoid solid bright colors except for specific action buttons or badges.
- Ensure the contrast between the white text and the blurred background remains high enough for readability.
