/**
 * ChromaMatrix Pro — High-Performance HTML5 Canvas Matrix Renderer
 * Supports 5x5 to 128x128 grid rendering, zoom & pan camera, cell hover tooltips, and interactive drawing.
 */

class MatrixRenderer {
    constructor(canvas, tooltipEl, onColorPickCallback) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tooltipEl = tooltipEl;
        this.onColorPickCallback = onColorPickCallback;

        // Grid & Data State
        this.gridSize = 16;
        this.mode = 'family'; // 'family', 'range', 'draw'
        this.matrixData = [];
        this.drawGridData = [];
        
        // Camera / Viewport State
        this.zoom = 1.0;
        this.minZoom = 0.5;
        this.maxZoom = 30.0;
        this.panX = 0;
        this.panY = 0;
        
        // Interactive Drawing State
        this.activeTool = 'brush'; // 'brush', 'fill', 'eyedropper', 'eraser'
        this.brushSize = 1;
        this.brushColor = '#3B82F6';
        this.isDrawing = false;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        
        // Undo / Redo History Stack for Custom Drawing
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 40;

        // Tooltip & Highlight State
        this.hoveredCell = null;
        this.tooltipEnabled = true;
        this.highlightedName = null; // { lang: 'english'|'chinese', name: string }

        // Initialize drawing grid
        this.initDrawGrid(16);
        this.bindEvents();
    }

    /**
     * Resize canvas to match container size while maintaining Retina/DPI sharpness
     */
    setDimensions(width, height) {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.scale(dpr, dpr);
        this.render();
    }

    /**
     * Change matrix grid dimensions (5 to 128) and rescale existing drawing
     */
    setGridSize(size) {
        if (size === this.gridSize) return;
        const oldSize = this.gridSize;
        this.gridSize = size;
        
        // Rescale existing drawing to fit new grid dimensions
        const newDrawGrid = [];
        for (let r = 0; r < size; r++) {
            const row = [];
            const rOld = Math.min(Math.floor(r * (oldSize / size)), oldSize - 1);
            for (let c = 0; c < size; c++) {
                const cOld = Math.min(Math.floor(c * (oldSize / size)), oldSize - 1);
                if (this.drawGridData[rOld] && this.drawGridData[rOld][cOld]) {
                    const oldCell = this.drawGridData[rOld][cOld];
                    row.push(this.createCellData(oldCell.hex, c, r));
                } else {
                    row.push(this.createCellData('#131B2E', c, r));
                }
            }
            newDrawGrid.push(row);
        }
        this.drawGridData = newDrawGrid;
        this.saveHistory();
        this.render();
    }

    createCellData(hex, c, r) {
        const { hexToRgb, rgbToHsl } = window.ColorMath;
        const rgb = hexToRgb(hex);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const closest = window.ColorNames ? window.ColorNames.findClosest(hex) : null;
        return { hex, rgb, hsl, col: c, row: r, closest };
    }

    initDrawGrid(size) {
        this.drawGridData = [];
        for (let r = 0; r < size; r++) {
            const row = [];
            for (let c = 0; c < size; c++) {
                row.push(this.createCellData('#131B2E', c, r));
            }
            this.drawGridData.push(row);
        }
        this.saveHistory();
    }

    updateMatrixData(data) {
        this.matrixData = data;
        this.render();
        if (window.appController && typeof window.appController.updateColorNameCounts === 'function') {
            window.appController.updateColorNameCounts();
        }
    }

    setMode(mode) {
        this.mode = mode;
        this.render();
        if (window.appController && typeof window.appController.updateColorNameCounts === 'function') {
            window.appController.updateColorNameCounts();
        }
    }

    setHighlightName(lang, name) {
        if (!lang || !name) {
            this.highlightedName = null;
        } else {
            this.highlightedName = { lang, name };
        }
        this.render();
    }

    setBrushColor(hex) {
        this.brushColor = hex;
    }

    setTool(tool) {
        this.activeTool = tool;
        if (tool === 'eyedropper') {
            this.canvas.style.cursor = 'cell';
        } else if (tool === 'eraser' || tool === 'brush' || tool === 'fill') {
            this.canvas.style.cursor = 'crosshair';
        }
        this.render();
    }

    setBrushSize(size) {
        this.brushSize = parseInt(size, 10);
        this.render();
    }

    // ==========================================
    // Camera Zoom & Pan Methods
    // ==========================================

    zoomIn() {
        this.setZoom(this.zoom * 1.25);
    }

    zoomOut() {
        this.setZoom(this.zoom / 1.25);
    }

    resetZoom() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.render();
        this.updateZoomDisplay();
    }

    setZoom(newZoom, centerX = null, centerY = null) {
        newZoom = Math.min(Math.max(newZoom, this.minZoom), this.maxZoom);
        if (newZoom === this.zoom) return;

        const rect = this.canvas.getBoundingClientRect();
        const cx = centerX !== null ? centerX : rect.width / 2;
        const cy = centerY !== null ? centerY : rect.height / 2;

        // Zoom centered on cursor/center
        const scale = newZoom / this.zoom;
        this.panX = cx - (cx - this.panX) * scale;
        this.panY = cy - (cy - this.panY) * scale;
        this.zoom = newZoom;

        this.render();
        this.updateZoomDisplay();
    }

    updateZoomDisplay() {
        const el = document.getElementById('zoom-level');
        if (el) {
            el.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    // ==========================================
    // Rendering Engine
    // ==========================================

    render() {
        const rect = this.canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        // Clear background
        this.ctx.fillStyle = '#060911';
        this.ctx.fillRect(0, 0, w, h);

        const data = this.mode === 'draw' ? this.drawGridData : this.matrixData;
        if (!data || data.length === 0) return;

        const size = this.gridSize;
        const baseCellSize = Math.min(w, h) / (size + 2);
        const cellSize = baseCellSize * this.zoom;
        
        // Center grid when at pan=0
        const gridWidth = size * cellSize;
        const gridHeight = size * cellSize;
        const offsetX = (w - gridWidth) / 2 + this.panX;
        const offsetY = (h - gridHeight) / 2 + this.panY;

        // Draw cells
        for (let r = 0; r < size; r++) {
            if (!data[r]) continue;
            for (let c = 0; c < size; c++) {
                const cell = data[r][c];
                if (!cell) continue;

                const x = offsetX + c * cellSize;
                const y = offsetY + r * cellSize;

                // Viewport culling (skip drawing cells outside canvas bounds)
                if (x + cellSize < 0 || x > w || y + cellSize < 0 || y > h) continue;

                this.ctx.fillStyle = cell.hex;
                this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));

                // Check color name highlight filter
                if (this.highlightedName) {
                    const closest = cell.closest || (window.ColorNames ? window.ColorNames.findClosest(cell.hex) : null);
                    if (!cell.closest && closest) cell.closest = closest;
                    const isMatch = closest && closest[this.highlightedName.lang] === this.highlightedName.name;
                    if (!isMatch) {
                        // Dim non-matching cells by drawing a semi-transparent dark overlay
                        this.ctx.fillStyle = 'rgba(6, 9, 17, 0.78)';
                        this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
                    }
                }

                // Draw crisp grid lines only if cells are large enough (> 5px) to prevent moiré patterns
                if (cellSize > 5) {
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
                }
            }
        }

        // Highlight hovered cell / brush indicator box with sleek border glow
        if (this.hoveredCell && this.hoveredCell.col < size && this.hoveredCell.row < size) {
            let startCol = this.hoveredCell.col;
            let endCol = this.hoveredCell.col;
            let startRow = this.hoveredCell.row;
            let endRow = this.hoveredCell.row;

            if (this.mode === 'draw' && (this.activeTool === 'brush' || this.activeTool === 'eraser')) {
                const N = this.brushSize || 1;
                startCol = Math.max(0, this.hoveredCell.col - Math.floor((N - 1) / 2));
                endCol = Math.min(size - 1, this.hoveredCell.col + Math.floor(N / 2));
                startRow = Math.max(0, this.hoveredCell.row - Math.floor((N - 1) / 2));
                endRow = Math.min(size - 1, this.hoveredCell.row + Math.floor(N / 2));
            }

            const hx = offsetX + startCol * cellSize;
            const hy = offsetY + startRow * cellSize;
            const boxWidth = (endCol - startCol + 1) * cellSize;
            const boxHeight = (endRow - startRow + 1) * cellSize;

            // Draw outer sleek glow and crisp border
            this.ctx.save();
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = Math.max(2, cellSize * 0.08);
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            this.ctx.shadowBlur = 4;
            this.ctx.strokeRect(hx, hy, boxWidth, boxHeight);

            // If in brush/eraser mode and brushSize > 1, add a subtle inner accent border
            if (this.mode === 'draw' && (this.activeTool === 'brush' || this.activeTool === 'eraser') && (this.brushSize || 1) > 1) {
                this.ctx.strokeStyle = this.activeTool === 'eraser' ? '#EF4444' : '#3B82F6';
                this.ctx.lineWidth = Math.max(1, cellSize * 0.04);
                this.ctx.strokeRect(hx + 1, hy + 1, boxWidth - 2, boxHeight - 2);
            }
            this.ctx.restore();
        }
    }

    // ==========================================
    // Mouse & Touch Event Handling
    // ==========================================

    bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    getCellFromMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const size = this.gridSize;
        const baseCellSize = Math.min(rect.width, rect.height) / (size + 2);
        const cellSize = baseCellSize * this.zoom;
        
        const gridWidth = size * cellSize;
        const gridHeight = size * cellSize;
        const offsetX = (rect.width - gridWidth) / 2 + this.panX;
        const offsetY = (rect.height - gridHeight) / 2 + this.panY;

        const col = Math.floor((mouseX - offsetX) / cellSize);
        const row = Math.floor((mouseY - offsetY) / cellSize);

        if (col >= 0 && col < size && row >= 0 && row < size) {
            return { col, row };
        }
        return null;
    }

    onMouseMove(e) {
        if (this.isPanning) {
            const dx = e.clientX - this.panStartX;
            const dy = e.clientY - this.panStartY;
            this.panX += dx;
            this.panY += dy;
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
            this.render();
            return;
        }

        const cellCoords = this.getCellFromMouse(e);
        
        if (cellCoords) {
            const data = this.mode === 'draw' ? this.drawGridData : this.matrixData;
            const cell = data[cellCoords.row] && data[cellCoords.row][cellCoords.col];
            
            if (cell) {
                this.hoveredCell = cellCoords;
                this.showTooltip(e, cell);
                
                // If dragging in draw mode, paint while moving
                if (this.isDrawing && this.mode === 'draw') {
                    if (this.activeTool === 'brush') {
                        this.paintAt(cellCoords.col, cellCoords.row, this.brushColor);
                    } else if (this.activeTool === 'eraser') {
                        this.paintAt(cellCoords.col, cellCoords.row, '#131B2E');
                    }
                }
                this.render();
                return;
            }
        }

        if (this.hoveredCell) {
            this.hoveredCell = null;
            this.hideTooltip();
            this.render();
        }
    }

    onMouseDown(e) {
        // Middle click (button 1) or right click (button 2) or Space held -> Pan
        if (e.button === 1 || e.button === 2 || e.spaceKey) {
            this.isPanning = true;
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (e.button === 0) {
            const cellCoords = this.getCellFromMouse(e);
            if (!cellCoords) return;

            if (this.mode === 'draw') {
                this.isDrawing = true;
                if (this.activeTool === 'brush') {
                    this.paintAt(cellCoords.col, cellCoords.row, this.brushColor);
                    this.saveHistory();
                } else if (this.activeTool === 'eraser') {
                    this.paintAt(cellCoords.col, cellCoords.row, '#131B2E');
                    this.saveHistory();
                } else if (this.activeTool === 'fill') {
                    this.floodFill(cellCoords.col, cellCoords.row, this.brushColor);
                    this.saveHistory();
                } else if (this.activeTool === 'eyedropper') {
                    const cell = this.drawGridData[cellCoords.row][cellCoords.col];
                    if (cell && this.onColorPickCallback) {
                        this.onColorPickCallback(cell.hex);
                    }
                }
                this.render();
            } else {
                // In Family or Range mode, left click picks the color to left panel!
                const data = this.matrixData;
                const cell = data[cellCoords.row] && data[cellCoords.row][cellCoords.col];
                if (cell && this.onColorPickCallback) {
                    this.onColorPickCallback(cell.hex);
                }
            }
        }
    }

    onMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = this.activeTool === 'eyedropper' ? 'cell' : 'crosshair';
        }
        if (this.isDrawing) {
            this.isDrawing = false;
        }
    }

    onMouseLeave(e) {
        this.isDrawing = false;
        this.isPanning = false;
        if (this.hoveredCell) {
            this.hoveredCell = null;
            this.hideTooltip();
            this.render();
        }
    }

    onWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
        this.setZoom(this.zoom * zoomFactor, mouseX, mouseY);
    }

    // ==========================================
    // Tooltip Popup Box Management
    // ==========================================

    showTooltip(e, cell) {
        if (!this.tooltipEl || !this.tooltipEnabled) return;
        this.tooltipEl.classList.remove('hidden');
        
        const swatch = document.getElementById('tooltip-swatch');
        const coords = document.getElementById('tooltip-coords');
        const hexEl = document.getElementById('tooltip-hex');
        const rgbEl = document.getElementById('tooltip-rgb');
        const hslEl = document.getElementById('tooltip-hsl');
        const nameEnEl = document.getElementById('tooltip-name-en');
        const nameZhEl = document.getElementById('tooltip-name-zh');

        if (swatch) swatch.style.backgroundColor = cell.hex;
        if (coords) coords.textContent = `Col: ${cell.col + 1}, Row: ${cell.row + 1}`;
        if (hexEl) hexEl.textContent = cell.hex;
        if (rgbEl) rgbEl.textContent = `${cell.rgb.r}, ${cell.rgb.g}, ${cell.rgb.b}`;
        if (hslEl) hslEl.textContent = `${cell.hsl.h}°, ${cell.hsl.s}%, ${cell.hsl.l}%`;

        if (window.ColorNames) {
            const closest = window.ColorNames.findClosest(cell.hex);
            if (nameEnEl) nameEnEl.textContent = closest.english;
            if (nameZhEl) nameZhEl.textContent = closest.chinese;
        } else {
            if (nameEnEl) nameEnEl.textContent = '-';
            if (nameZhEl) nameZhEl.textContent = '-';
        }

        // Position tooltip near mouse without clipping outside screen
        const tipWidth = 240;
        const tipHeight = 180;
        
        let left = e.clientX + 15;
        let top = e.clientY + 15;

        if (left + tipWidth > window.innerWidth) {
            left = e.clientX - tipWidth - 15;
        }
        if (top + tipHeight > window.innerHeight) {
            top = e.clientY - tipHeight - 15;
        }

        this.tooltipEl.style.left = `${Math.max(10, left)}px`;
        this.tooltipEl.style.top = `${Math.max(10, top)}px`;
    }

    hideTooltip() {
        if (this.tooltipEl) {
            this.tooltipEl.classList.add('hidden');
        }
    }

    setTooltipEnabled(enabled) {
        this.tooltipEnabled = enabled;
        if (!enabled) {
            this.hideTooltip();
        }
    }

    // ==========================================
    // Interactive Drawing Algorithms
    // ==========================================

    paintAt(centerCol, centerRow, hexColor) {
        const size = this.gridSize;
        const N = this.brushSize || 1;
        const startCol = centerCol - Math.floor((N - 1) / 2);
        const endCol = centerCol + Math.floor(N / 2);
        const startRow = centerRow - Math.floor((N - 1) / 2);
        const endRow = centerRow + Math.floor(N / 2);

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                if (r >= 0 && r < size && c >= 0 && c < size) {
                    this.drawGridData[r][c] = this.createCellData(hexColor, c, r);
                }
            }
        }
    }

    floodFill(startCol, startRow, replacementHex) {
        const size = this.gridSize;
        const targetHex = this.drawGridData[startRow][startCol].hex;
        if (targetHex === replacementHex) return;

        const queue = [{ col: startCol, row: startRow }];
        const visited = new Set();

        while (queue.length > 0) {
            const { col, row } = queue.shift();
            const key = `${col},${row}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (this.drawGridData[row][col].hex === targetHex) {
                this.drawGridData[row][col] = this.createCellData(replacementHex, col, row);

                if (col > 0) queue.push({ col: col - 1, row });
                if (col < size - 1) queue.push({ col: col + 1, row });
                if (row > 0) queue.push({ col, row: row - 1 });
                if (row < size - 1) queue.push({ col, row: row + 1 });
            }
        }
    }

    clearDrawGrid() {
        this.initDrawGrid(this.gridSize);
        this.render();
    }

    /**
     * Loads an image file (PNG, JPEG, GIF, etc.), compresses/resamples it into a 128x128 grid,
     * and sets it as the active drawing grid.
     */
    loadImageFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file (PNG, JPEG, GIF, etc.).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const targetSize = 128;
                const offscreen = document.createElement('canvas');
                offscreen.width = targetSize;
                offscreen.height = targetSize;
                const offCtx = offscreen.getContext('2d');

                offCtx.drawImage(img, 0, 0, targetSize, targetSize);
                const imgData = offCtx.getImageData(0, 0, targetSize, targetSize).data;

                this.gridSize = targetSize;
                if (window.appController && typeof window.appController.syncGridSizeUI === 'function') {
                    window.appController.syncGridSizeUI(targetSize);
                }

                const newDrawGrid = [];
                for (let r = 0; r < targetSize; r++) {
                    const row = [];
                    for (let c = 0; c < targetSize; c++) {
                        const idx = (r * targetSize + c) * 4;
                        const red = imgData[idx];
                        const green = imgData[idx + 1];
                        const blue = imgData[idx + 2];
                        const alpha = imgData[idx + 3];

                        let hex = '#131B2E';
                        if (alpha > 30) {
                            const { rgbToHex } = window.ColorMath;
                            hex = `#${rgbToHex(red, green, blue)}`;
                        }
                        row.push(this.createCellData(hex, c, r));
                    }
                    newDrawGrid.push(row);
                }

                this.drawGridData = newDrawGrid;
                this.saveHistory();
                this.render();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ==========================================
    // Undo / Redo History Stack
    // ==========================================

    saveHistory() {
        // Remove redo states beyond current index
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Deep clone current draw grid
        const snapshot = this.drawGridData.map(row => row.map(cell => ({ ...cell })));
        this.history.push(snapshot);

        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        this.updateUndoRedoUI();
        if (window.appController && typeof window.appController.updateColorNameCounts === 'function') {
            window.appController.updateColorNameCounts();
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const snapshot = this.history[this.historyIndex];
            this.gridSize = snapshot.length;
            this.drawGridData = snapshot.map(row => row.map(cell => ({ ...cell })));
            if (window.appController && typeof window.appController.syncGridSizeUI === 'function') {
                window.appController.syncGridSizeUI(this.gridSize);
            }
            this.render();
            this.updateUndoRedoUI();
            if (window.appController && typeof window.appController.updateColorNameCounts === 'function') {
                window.appController.updateColorNameCounts();
            }
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const snapshot = this.history[this.historyIndex];
            this.gridSize = snapshot.length;
            this.drawGridData = snapshot.map(row => row.map(cell => ({ ...cell })));
            if (window.appController && typeof window.appController.syncGridSizeUI === 'function') {
                window.appController.syncGridSizeUI(this.gridSize);
            }
            this.render();
            this.updateUndoRedoUI();
            if (window.appController && typeof window.appController.updateColorNameCounts === 'function') {
                window.appController.updateColorNameCounts();
            }
        }
    }

    updateUndoRedoUI() {
        const btnUndo = document.getElementById('btn-undo');
        const btnRedo = document.getElementById('btn-redo');
        if (btnUndo) btnUndo.disabled = this.historyIndex <= 0;
        if (btnRedo) btnRedo.disabled = this.historyIndex >= this.history.length - 1;
    }

    // ==========================================
    // Exporting Functionality
    // ==========================================

    exportPNG() {
        const size = this.gridSize;
        const cellPx = 32; // Export at crisp resolution
        const exportW = size * cellPx;
        const exportH = size * cellPx;

        const offscreen = document.createElement('canvas');
        offscreen.width = exportW;
        offscreen.height = exportH;
        const offCtx = offscreen.getContext('2d');

        const data = this.mode === 'draw' ? this.drawGridData : this.matrixData;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = data[r][c];
                offCtx.fillStyle = cell.hex;
                offCtx.fillRect(c * cellPx, r * cellPx, cellPx, cellPx);
            }
        }

        const link = document.createElement('a');
        link.download = `chroma-matrix-${this.mode}-${size}x${size}.png`;
        link.href = offscreen.toDataURL('image/png');
        link.click();
    }

    exportJSON() {
        const data = this.mode === 'draw' ? this.drawGridData : this.matrixData;
        const exportPayload = {
            title: `ChromaMatrix ${this.mode.toUpperCase()} Palette`,
            gridSize: `${this.gridSize}x${this.gridSize}`,
            timestamp: new Date().toISOString(),
            colors: data.map(row => row.map(cell => ({
                hex: cell.hex,
                rgb: cell.rgb,
                hsl: cell.hsl,
                col: cell.col,
                row: cell.row
            })))
        };

        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = `chroma-palette-${this.mode}-${this.gridSize}x${this.gridSize}.json`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }
}

// Export to global scope
window.MatrixRenderer = MatrixRenderer;
