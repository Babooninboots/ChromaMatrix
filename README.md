# ChromaMatrix Pro — Interactive Color Matrix & Palette Suite

[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)]()
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=for-the-badge&logo=html5&logoColor=white)]()
[![CSS3 Glassmorphism](https://img.shields.io/badge/CSS3-Glassmorphism-1572B6?style=for-the-badge&logo=css3&logoColor=white)]()
[![Zero Build Step](https://img.shields.io/badge/Zero_Build-Ready_to_Run-10B981?style=for-the-badge)]()

**ChromaMatrix Pro** is a professional, high-performance web application designed for color exploration, contrast analysis, palette generation, and interactive matrix drawing. Built with pure Vanilla JavaScript and powered by an ultra-fast HTML5 Canvas rendering engine, it handles up to a **128x128 grid (16,384 cells)** at a buttery-smooth 60 FPS without requiring any bundler or Node.js build step.

---

## 🌟 Key Features

### 1. 🎯 Integrated Color Pickers & Closest Color Names
- **Master & End Color Pickers**: Two dedicated color picker cards in the left sidebar for controlling the Primary (Master) and Secondary (End) colors.
- **Closest Color Names Engine**: Features a built-in color dictionary containing **140 English HTML Color Names** and **163 Traditional Chinese Color Names (雅称)**! Whenever you select or modify the Master Color, the closest English and Chinese color names are displayed instantly with clickable swatches to apply that exact color.
- **Color Code Sync**: Entering or adjusting any color via HEX, RGB (0-255), or HSL (0-360°, 0-100%) automatically updates all sliders, numeric inputs, visual swatches, and closest names in real time without infinite feedback loops.
- **Click-to-Copy**: One-click copy buttons for HEX, RGB, and HSL strings with brief "Copied!" feedback animations.
- **Visual Channel Sliders**: Interactive gradients for Red, Green, Blue, Hue, Saturation, and Lightness channels.
- **Master Picker & Copy Actions**: Pick colors directly from your OS color dialog and copy formatted codes to your clipboard with one-click checkmark feedback.

### 2. ♿ Live Contrast & Readability Analysis
- **WCAG Compliance Engine**: Calculates real-time luminance contrast ratios against `#FFFFFF` (White) and `#000000` (Black) text.
- **Visual Badges**: Automatically evaluates accessibility compliance levels (`AAA`, `AA`, `AA Large`, or `Fail`).
- **Quick Harmonies & Hover Popups**: Instant click-to-load swatches for Complementary, Analogous, and Triadic color harmonies. Hovering over any harmony swatch reveals a global floating popup displaying its exact HEX, RGB, and HSL color codes!

### 3. 🖥️ High-Performance Interactive Color Matrix & Sidebox Dictionary
- **Scalable Dimensions**: Choose from quick presets (`5x5`, `16x16`, `32x32`, `64x64`, `128x128`) or use the custom slider to set any square grid dimension between 5 and 128.
- **Zoom & Pan Camera**: 
  - Mouse wheel zooming (from `0.5x` up to `30x`) centered precisely at your mouse cursor.
  - Smooth dragging / panning across large grids using Middle-Click or holding `Spacebar` + Drag.
- **Scrollable Color Name List Sidebox**: A dedicated interactive side panel alongside the matrix canvas featuring tabs for **English (140)** and **Chinese (163 雅称)** color dictionaries with instant search filtering.
  - **Dynamic Histogram Sorting**: As you explore or paint on the canvas, the list **automatically sorts by block count in descending order (showing dominant colors at the very top)**.
  - **Zero-Block Hiding**: In normal browsing mode, color names with **0 blocks are automatically hidden** to keep your palette breakdown clean and clutter-free! When typing in the filter box, matching names from the full dictionary are dynamically revealed.
  - **Clean Block Highlighting**: Clicking any name in the sidebox instantly highlights matching blocks by cleanly darkening all non-matching blocks across all three modes (**Color Family**, **Color Range**, and **Custom Draw**).
- **Hover Tooltip Popup Box**: A sleek glassmorphic floating badge tracks your mouse over the grid, instantly revealing the cell's coordinates (`Col, Row`), color swatch, and exact HEX, RGB, and HSL values. Can be switched **ON** and **OFF** on the fly using the dedicated toggle button located between the function selection buttons and Grid Size controls.

### 4. 🛠️ Three Powerful Matrix Modes

#### 🔵 Color Family Mode
Explores the Saturation and Lightness spectrum around your selected Master color:
- **Centered ±20% Range**: Varies Saturation within **±20%** of the Master color along the X-axis and Lightness within **±20%** along the Y-axis, keeping the Master color positioned at the exact center of the matrix.
- **Dynamic Edge Clamping & Step Recalculation**: If either end reaches **0%** or **100%** Saturation or Lightness, that edge is capped at 0% or 100% and the step size dynamically recalculates to maintain visual balance.
- **Real-Time Step Badges**: Displays exact calculated step percentages ($\Delta S$ and $\Delta L$) per cell for the current grid resolution.

#### 🌈 Color Range Mode
Generates a 2D color distribution between a **Top-Left Start Color** and a **Bottom-Right End Color**:
- **Diagonal Hue Interpolation**: Smoothly transitions Hue along the diagonal using the **Shortest Angular Path** around the 360° color wheel (with an option to toggle linear path).
- **Orthogonal Distribution**: Distributes Saturation along the X-axis and Lightness along the Y-axis.
- **Quick Swap**: Swap start and end colors with a single button click.

#### 🎨 Custom Drawing Mode
Turn the color matrix into a pixel-art canvas or custom palette builder:
- **Pro Drawing Tools**: Paint Brush, Flood Fill (BFS bucket fill algorithm), Eyedropper (picks cell color to the left panel), and Eraser.
- **Dynamic Drawing Scaling**: Changing the matrix grid dimensions automatically rescales and resamples your current drawing without erasing your artwork!
- **Image Import & Compression**: Load any image file (PNG, JPG, GIF, WebP) directly into Custom Draw mode! The image is automatically resampled and compressed into a 128x128 pixel matrix grid.
- **Brush Sizes & Indicator Box**: Choose between `1px`, `2px`, `3px`, or `5px` brush radiuses. A dynamic **Brush Indicator Box** outlines the exact block of cells that will be touched by your brush or eraser as you hover!
- **History Stack**: 40-state **Undo / Redo** history preserves your artwork and restores exact grid dimensions when stepping through history.

### 5. 💾 Exporting & Sharing
- **Export PNG**: Render and download your matrix as a crisp, high-resolution PNG image (automatically scaled for clean pixel borders).
- **Export JSON**: Download structured JSON palette data including grid dimensions, timestamps, and full color coordinates for every cell.

---

## 🚀 Quickstart & Installation

**ChromaMatrix Pro requires ZERO build tools, bundlers, or package installations.**

### Option A: Standalone Single-File Bundle (Ultra-Portable!)
For ultimate portability, we have packaged the entire application (HTML, CSS, Color Math, Canvas Renderer, and Controller) into a single standalone file:
- Simply double-click **`chroma-matrix-pro.html`** or attach it to an email/message! It runs natively anywhere with zero external dependencies.

### Option B: Modular File Execution (For Development)
Because the codebase uses clean global module scoping, you can also run the modular app directly from your file system without encountering browser CORS errors:
1. Double-click `index.html` to open it in any modern web browser (Chrome, Edge, Firefox, Safari).

### Option C: Local Static Server
If you prefer running via a local development server:
```bash
# Using npx serve
npx -y serve .

# OR using Python
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your browser.

---

## 📁 Project Structure

```text
ColorList/
├── index.html              # Semantic HTML layout (Left Sidebar & Right Matrix Workspace)
├── chroma-matrix-pro.html  # Standalone single-file bundle (~104 KB portable app)
├── css/
│   └── style.css           # Studio Colorist dark mode theme, glassmorphism & responsive layout
└── js/
    ├── color-names.js      # Bilingual dictionary (140 EN / 163 ZH colors) & Euclidean matching
    ├── color-math.js       # Precision color algorithms (HEX/RGB/HSL, WCAG, Matrix Generators)
    ├── matrix-canvas.js    # HTML5 Canvas 60 FPS renderer, zoom/pan camera & drawing engine
    └── app.js              # Application state controller & UI event binding
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Mode |
| :--- | :--- | :--- |
| `Mouse Wheel` | Zoom In / Out (Centered at cursor) | All Modes |
| `Middle-Click + Drag` | Pan across zoomed canvas | All Modes |
| `Spacebar + Drag` | Pan across zoomed canvas | All Modes |
| `B` | Select **Paint Brush** tool | Custom Draw |
| `F` | Select **Flood Fill** tool | Custom Draw |
| `I` | Select **Eyedropper** tool | Custom Draw |
| `E` | Select **Eraser** tool | Custom Draw |
| `Ctrl + Z` | **Undo** last drawing stroke | Custom Draw |
| `Ctrl + Y` | **Redo** drawing stroke | Custom Draw |

---

## 📄 License
This project is open-source and available under the **MIT License**.
