/**
 * ChromaMatrix Pro — Application Controller
 * Unites left panel autosyncing color inputs, contrast preview, mode switching, and matrix rendering.
 */

class AppController {
    constructor() {
        this.currentHex = '#3B82F6';
        this.primaryHex = '#3B82F6';
        this.secondaryHex = '#FFCC00';
        this.activePickerTarget = 'primary'; // 'primary' or 'secondary'
        this.renderer = null;
        this.isSyncing = false; // Guard to prevent circular input update loops

        window.appController = this;
        this.init();
    }

    init() {
        this.setupRenderer();
        this.bindColorInputs();
        this.bindPickerSelection();
        this.bindMatrixControls();
        this.bindDrawTools();
        this.bindQuickHarmonies();
        this.bindCopyButtons();
        this.bindExportButtons();
        this.setupResizeListener();

        // Initial sync
        this.updateColorFromHex(this.primaryHex, 'init');
    }

    setupRenderer() {
        const canvas = document.getElementById('matrix-canvas');
        const tooltip = document.getElementById('color-tooltip');
        const container = document.getElementById('canvas-container');

        const MatrixRenderer = window.MatrixRenderer;
        this.renderer = new MatrixRenderer(canvas, tooltip, (pickedHex) => {
            this.updateColorFromHex(pickedHex);
        });

        // Set initial dimensions
        const rect = container.getBoundingClientRect();
        this.renderer.setDimensions(rect.width, rect.height);
        this.updateMatrix();
    }

    setupResizeListener() {
        window.addEventListener('resize', () => {
            const container = document.getElementById('canvas-container');
            if (container && this.renderer) {
                const rect = container.getBoundingClientRect();
                this.renderer.setDimensions(rect.width, rect.height);
            }
        });
    }

    // ==========================================
    // 1. Integrated Color Pickers & Autosyncing
    // ==========================================

    bindPickerSelection() {
        const cardPrimary = document.getElementById('card-picker-primary');
        const cardSecondary = document.getElementById('card-picker-secondary');
        const pickerPrimary = document.getElementById('picker-primary');
        const pickerSecondary = document.getElementById('picker-secondary');
        const btnSwap = document.getElementById('btn-left-swap');

        // Click on Primary Card -> Edit Primary
        if (cardPrimary) {
            cardPrimary.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return; // Handled by picker change
                this.selectPicker('primary');
            });
        }

        // Click on Secondary Card -> Edit Secondary
        if (cardSecondary) {
            cardSecondary.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;
                this.selectPicker('secondary');
            });
        }

        // Native Color Picker Dialogs
        if (pickerPrimary) {
            pickerPrimary.addEventListener('input', (e) => {
                this.selectPicker('primary', false);
                this.updateColorFromHex(e.target.value, 'picker-primary');
            });
        }

        if (pickerSecondary) {
            pickerSecondary.addEventListener('input', (e) => {
                this.selectPicker('secondary', false);
                this.updateColorFromHex(e.target.value, 'picker-secondary');
            });
        }

        // Swap Colors Button
        if (btnSwap) {
            btnSwap.addEventListener('click', () => {
                const temp = this.primaryHex;
                this.primaryHex = this.secondaryHex;
                this.secondaryHex = temp;

                // Update UI pickers
                this.setPickerUI('primary', this.primaryHex);
                this.setPickerUI('secondary', this.secondaryHex);

                // Refresh currently edited color
                const activeHex = this.activePickerTarget === 'secondary' ? this.secondaryHex : this.primaryHex;
                this.updateColorFromHex(activeHex, 'swap');
                this.updateMatrix();
            });
        }
    }

    selectPicker(target, loadColor = true) {
        this.activePickerTarget = target;
        const cardPrimary = document.getElementById('card-picker-primary');
        const cardSecondary = document.getElementById('card-picker-secondary');

        if (cardPrimary) cardPrimary.classList.toggle('active', target === 'primary');
        if (cardSecondary) cardSecondary.classList.toggle('active', target === 'secondary');

        if (loadColor) {
            const hexToLoad = target === 'secondary' ? this.secondaryHex : this.primaryHex;
            this.updateColorFromHex(hexToLoad, 'card-switch');
        }
    }

    setPickerUI(target, hex) {
        const pickerEl = document.getElementById(`picker-${target}`);
        const hexEl = document.getElementById(`hex-display-${target}`);
        if (pickerEl) pickerEl.value = hex;
        if (hexEl) hexEl.textContent = hex;
    }

    updateColorFromHex(hex, source = 'external') {
        if (this.isSyncing) return;
        const { cleanHex, hexToRgb, rgbToHsl } = window.ColorMath;
        
        const cleaned = cleanHex(hex);
        if (!cleaned) return;

        this.isSyncing = true;
        this.currentHex = `#${cleaned}`;

        // Update active target hex (primary or secondary)
        if (this.activePickerTarget === 'secondary' && this.renderer?.mode === 'range') {
            this.secondaryHex = this.currentHex;
            if (source !== 'picker-secondary') this.setPickerUI('secondary', this.currentHex);
        } else {
            this.primaryHex = this.currentHex;
            if (source !== 'picker-primary') this.setPickerUI('primary', this.currentHex);
        }

        const rgb = hexToRgb(this.currentHex);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        // Update HEX Input
        const inputHex = document.getElementById('input-hex');
        if (inputHex && source !== 'hex') inputHex.value = cleaned;

        // Update RGB Inputs & Sliders
        if (source !== 'rgb') {
            this.setVal('input-r', rgb.r); this.setVal('slider-r', rgb.r);
            this.setVal('input-g', rgb.g); this.setVal('slider-g', rgb.g);
            this.setVal('input-b', rgb.b); this.setVal('slider-b', rgb.b);
        }

        // Update HSL Inputs & Sliders
        if (source !== 'hsl') {
            this.setVal('input-h', hsl.h); this.setVal('slider-h', hsl.h);
            this.setVal('input-s', hsl.s); this.setVal('slider-s', hsl.s);
            this.setVal('input-l', hsl.l); this.setVal('slider-l', hsl.l);
        }

        // Update Preview Card & Contrast Metrics
        this.updatePreviewAndContrast(rgb, hsl);

        // Update Renderer Brush Color & Active Matrix Mode
        if (this.renderer) {
            this.renderer.setBrushColor(this.currentHex);
            this.updateMatrix();
        }

        this.isSyncing = false;
    }

    setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    syncGridSizeUI(size) {
        const sliderGrid = document.getElementById('slider-grid-size');
        const inputGrid = document.getElementById('input-grid-size');
        const gridH = document.getElementById('grid-size-h');

        if (sliderGrid) sliderGrid.value = size;
        if (inputGrid) inputGrid.value = size;
        if (gridH) gridH.textContent = size;

        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === size);
        });
    }

    updatePreviewAndContrast(rgb, hsl) {
        const { getContrastRatio, evaluateWcag } = window.ColorMath;
        
        // Preview background
        const previewBox = document.getElementById('preview-box');
        if (previewBox) previewBox.style.backgroundColor = this.currentHex;

        // Calculate WCAG Contrast Ratios
        const whiteRatio = getContrastRatio(rgb, { r: 255, g: 255, b: 255 });
        const blackRatio = getContrastRatio(rgb, { r: 0, g: 0, b: 0 });

        const whiteWcag = evaluateWcag(whiteRatio);
        const blackWcag = evaluateWcag(blackRatio);

        const elRatioWhite = document.getElementById('ratio-white');
        const elBadgeWhite = document.getElementById('badge-white');
        if (elRatioWhite) elRatioWhite.textContent = `${whiteRatio.toFixed(2)}:1`;
        if (elBadgeWhite) {
            elBadgeWhite.textContent = whiteWcag.label;
            elBadgeWhite.className = `wcag-badge ${whiteWcag.className}`;
        }

        const elRatioBlack = document.getElementById('ratio-black');
        const elBadgeBlack = document.getElementById('badge-black');
        if (elRatioBlack) elRatioBlack.textContent = `${blackRatio.toFixed(2)}:1`;
        if (elBadgeBlack) {
            elBadgeBlack.textContent = blackWcag.label;
            elBadgeBlack.className = `wcag-badge ${blackWcag.className}`;
        }

        // Update Quick Harmonies
        this.updateHarmonySwatches(hsl);
    }

    updateHarmonySwatches(hsl) {
        const { hslToHex } = window.ColorMath;
        
        // Complementary (180°)
        const compHex = hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l);
        this.setSwatch('swatch-comp', `#${compHex}`);

        // Analogous (±30°)
        const ana1Hex = hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l);
        const ana2Hex = hslToHex((hsl.h + 330) % 360, hsl.s, hsl.l);
        this.setSwatch('swatch-ana1', `#${ana1Hex}`);
        this.setSwatch('swatch-ana2', `#${ana2Hex}`);

        // Triadic (±120°)
        const tri1Hex = hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l);
        const tri2Hex = hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l);
        this.setSwatch('swatch-tri1', `#${tri1Hex}`);
        this.setSwatch('swatch-tri2', `#${tri2Hex}`);
    }

    setSwatch(id, hex) {
        const el = document.getElementById(id);
        if (el) {
            el.style.backgroundColor = hex;
            const parent = el.parentElement;
            parent.onclick = () => this.updateColorFromHex(hex);
            parent.onmouseenter = (e) => this.showHarmonyTooltip(e, hex, parent.getAttribute('data-label') || parent.getAttribute('title') || 'Harmony');
            parent.onmousemove = (e) => this.showHarmonyTooltip(e, hex, parent.getAttribute('data-label') || parent.getAttribute('title') || 'Harmony');
            parent.onmouseleave = () => this.hideHarmonyTooltip();
        }
    }

    showHarmonyTooltip(e, hex, label) {
        if (this.renderer && !this.renderer.tooltipEnabled) return;
        const tooltipEl = document.getElementById('color-tooltip');
        if (!tooltipEl) return;

        const { hexToRgb, hexToHsl } = window.ColorMath;
        const rgb = hexToRgb(hex);
        const hsl = hexToHsl(hex);

        tooltipEl.classList.remove('hidden');
        
        const swatch = document.getElementById('tooltip-swatch');
        const coords = document.getElementById('tooltip-coords');
        const hexEl = document.getElementById('tooltip-hex');
        const rgbEl = document.getElementById('tooltip-rgb');
        const hslEl = document.getElementById('tooltip-hsl');

        if (swatch) swatch.style.backgroundColor = hex;
        if (coords) coords.textContent = label;
        if (hexEl) hexEl.textContent = hex.toUpperCase();
        if (rgbEl) rgbEl.textContent = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        if (hslEl) hslEl.textContent = `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`;

        const tipWidth = 220;
        const tipHeight = 140;
        
        let left = e.clientX + 15;
        let top = e.clientY + 15;

        if (left + tipWidth > window.innerWidth) {
            left = e.clientX - tipWidth - 15;
        }
        if (top + tipHeight > window.innerHeight) {
            top = e.clientY - tipHeight - 15;
        }

        tooltipEl.style.left = `${Math.max(10, left)}px`;
        tooltipEl.style.top = `${Math.max(10, top)}px`;
    }

    hideHarmonyTooltip() {
        const tooltipEl = document.getElementById('color-tooltip');
        if (tooltipEl) {
            tooltipEl.classList.add('hidden');
        }
    }

    bindColorInputs() {
        const { isValidHex, clamp, rgbToHex, hslToHex } = window.ColorMath;
        
        // HEX Input
        const inputHex = document.getElementById('input-hex');
        if (inputHex) {
            inputHex.addEventListener('input', (e) => {
                const val = e.target.value;
                if (isValidHex(val)) {
                    this.updateColorFromHex(val, 'hex');
                }
            });
        }

        // RGB Inputs & Sliders
        const updateFromRgb = () => {
            const r = clamp(parseInt(document.getElementById('input-r').value || 0, 10), 0, 255);
            const g = clamp(parseInt(document.getElementById('input-g').value || 0, 10), 0, 255);
            const b = clamp(parseInt(document.getElementById('input-b').value || 0, 10), 0, 255);
            const hex = rgbToHex(r, g, b);
            this.updateColorFromHex(`#${hex}`, 'rgb');
        };

        ['r', 'g', 'b'].forEach(channel => {
            const numEl = document.getElementById(`input-${channel}`);
            const sliderEl = document.getElementById(`slider-${channel}`);
            if (numEl && sliderEl) {
                numEl.addEventListener('input', () => { sliderEl.value = numEl.value; updateFromRgb(); });
                sliderEl.addEventListener('input', () => { numEl.value = sliderEl.value; updateFromRgb(); });
            }
        });

        // HSL Inputs & Sliders
        const updateFromHsl = () => {
            const h = clamp(parseInt(document.getElementById('input-h').value || 0, 10), 0, 360);
            const s = clamp(parseInt(document.getElementById('input-s').value || 0, 10), 0, 100);
            const l = clamp(parseInt(document.getElementById('input-l').value || 0, 10), 0, 100);
            const hex = hslToHex(h, s, l);
            this.updateColorFromHex(`#${hex}`, 'hsl');
        };

        ['h', 's', 'l'].forEach(channel => {
            const numEl = document.getElementById(`input-${channel}`);
            const sliderEl = document.getElementById(`slider-${channel}`);
            if (numEl && sliderEl) {
                numEl.addEventListener('input', () => { sliderEl.value = numEl.value; updateFromHsl(); });
                sliderEl.addEventListener('input', () => { numEl.value = sliderEl.value; updateFromHsl(); });
            }
        });
    }

    // ==========================================
    // 2. Matrix Toolbar & Mode Switching
    // ==========================================

    bindMatrixControls() {
        const { clamp } = window.ColorMath;
        
        // Mode Tabs
        const tabBtns = document.querySelectorAll('.mode-tabs .tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const mode = btn.dataset.mode;
                document.querySelectorAll('.subtoolbar-group').forEach(group => group.classList.remove('active'));
                const targetSub = document.getElementById(`subtoolbar-${mode}`);
                if (targetSub) targetSub.classList.add('active');

                // Adjust left panel pickers based on mode
                const cardSec = document.getElementById('card-picker-secondary');
                const btnSwap = document.getElementById('btn-left-swap');
                const labelPrim = document.getElementById('label-picker-primary');

                if (mode === 'range') {
                    if (cardSec) cardSec.classList.remove('hidden');
                    if (btnSwap) btnSwap.classList.remove('hidden');
                    if (labelPrim) labelPrim.textContent = 'Start Color';
                    
                    // If secondary was active, make sure its color is loaded
                    if (this.activePickerTarget === 'secondary') {
                        this.updateColorFromHex(this.secondaryHex, 'mode-switch');
                    } else {
                        this.updateColorFromHex(this.primaryHex, 'mode-switch');
                    }
                } else {
                    if (cardSec) cardSec.classList.add('hidden');
                    if (btnSwap) btnSwap.classList.add('hidden');
                    if (labelPrim) labelPrim.textContent = 'Master Color';
                    
                    // Revert to primary if secondary was selected
                    if (this.activePickerTarget === 'secondary') {
                        this.selectPicker('primary', true);
                    } else {
                        this.updateColorFromHex(this.primaryHex, 'mode-switch');
                    }
                }

                if (this.renderer) {
                    this.renderer.setMode(mode);
                    this.updateMatrix();
                }
            });
        });

        // Popup Info Box Toggle
        const btnToggleTip = document.getElementById('btn-toggle-tooltip');
        const tipToggleText = document.getElementById('tooltip-toggle-text');
        let tooltipOn = true;

        if (btnToggleTip) {
            btnToggleTip.addEventListener('click', () => {
                tooltipOn = !tooltipOn;
                if (tooltipOn) {
                    btnToggleTip.style.borderColor = 'var(--accent-blue)';
                    btnToggleTip.style.background = 'rgba(59, 130, 246, 0.15)';
                    btnToggleTip.style.color = 'var(--text-primary)';
                    if (tipToggleText) tipToggleText.textContent = 'Popup: ON';
                } else {
                    btnToggleTip.style.borderColor = 'var(--border-color)';
                    btnToggleTip.style.background = 'rgba(255, 255, 255, 0.05)';
                    btnToggleTip.style.color = 'var(--text-secondary)';
                    if (tipToggleText) tipToggleText.textContent = 'Popup: OFF';
                }
                if (this.renderer) {
                    this.renderer.setTooltipEnabled(tooltipOn);
                }
            });
        }

        // Grid Dimension Slider & Number
        const sliderGrid = document.getElementById('slider-grid-size');
        const inputGrid = document.getElementById('input-grid-size');
        const gridH = document.getElementById('grid-size-h');

        const updateGridSize = (size) => {
            size = clamp(parseInt(size, 10) || 16, 5, 128);
            this.syncGridSizeUI(size);

            if (this.renderer) {
                this.renderer.setGridSize(size);
                this.updateMatrix();
            }
        };

        if (sliderGrid) sliderGrid.addEventListener('input', (e) => updateGridSize(e.target.value));
        if (inputGrid) inputGrid.addEventListener('change', (e) => updateGridSize(e.target.value));

        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.addEventListener('click', () => updateGridSize(btn.dataset.size));
        });

        const checkShortest = document.getElementById('check-shortest-hue');
        if (checkShortest) {
            checkShortest.addEventListener('change', () => this.updateMatrix());
        }

        // Zoom Controls
        const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        const btnZoomFit = document.getElementById('btn-zoom-fit');

        if (btnZoomIn) btnZoomIn.addEventListener('click', () => this.renderer && this.renderer.zoomIn());
        if (btnZoomOut) btnZoomOut.addEventListener('click', () => this.renderer && this.renderer.zoomOut());
        if (btnZoomFit) btnZoomFit.addEventListener('click', () => this.renderer && this.renderer.resetZoom());
    }

    updateMatrix() {
        if (!this.renderer) return;
        const { generateFamilyMatrix, generateRangeMatrix, hexToHsl } = window.ColorMath;

        const size = this.renderer.gridSize;
        const mode = this.renderer.mode;

        if (mode === 'family') {
            const matrix = generateFamilyMatrix(this.primaryHex, size, size);
            this.renderer.updateMatrixData(matrix);
            
            // Update UI badges for calculated step sizes
            const stepSat = matrix.stepSat !== undefined ? matrix.stepSat.toFixed(1) : (size > 1 ? (100 / (size - 1)).toFixed(1) : '0');
            const stepLight = matrix.stepLight !== undefined ? matrix.stepLight.toFixed(1) : (size > 1 ? (100 / (size - 1)).toFixed(1) : '0');
            const elHue = document.getElementById('fam-hue-val');
            const elStepS = document.getElementById('fam-step-sat');
            const elStepL = document.getElementById('fam-step-light');
            const hsl = hexToHsl(this.primaryHex);
            if (elHue) elHue.textContent = `${hsl.h}°`;
            if (elStepS) elStepS.textContent = `${stepSat}% / cell`;
            if (elStepL) elStepL.textContent = `${stepLight}% / cell`;
        } else if (mode === 'range') {
            const shortestHue = document.getElementById('check-shortest-hue')?.checked ?? true;
            const matrix = generateRangeMatrix(this.primaryHex, this.secondaryHex, size, size, shortestHue);
            this.renderer.updateMatrixData(matrix);
        } else if (mode === 'draw') {
            this.renderer.render();
        }
    }

    // ==========================================
    // 3. Custom Drawing Tools & Actions
    // ==========================================

    bindDrawTools() {
        const toolBtns = document.querySelectorAll('.draw-tools .tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.renderer) this.renderer.setTool(btn.dataset.tool);
            });
        });

        const sizeBtns = document.querySelectorAll('.brush-sizes .brush-size-btn');
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                sizeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.renderer) this.renderer.setBrushSize(btn.dataset.size);
            });
        });

        const btnUndo = document.getElementById('btn-undo');
        const btnRedo = document.getElementById('btn-redo');
        const btnClear = document.getElementById('btn-clear-draw');
        const btnImport = document.getElementById('btn-import-img');
        const inputImport = document.getElementById('input-import-img');

        if (btnImport && inputImport) {
            btnImport.addEventListener('click', () => inputImport.click());
            inputImport.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file && this.renderer) {
                    this.renderer.loadImageFile(file);
                    inputImport.value = '';
                }
            });
        }

        if (btnUndo) btnUndo.addEventListener('click', () => this.renderer && this.renderer.undo());
        if (btnRedo) btnRedo.addEventListener('click', () => this.renderer && this.renderer.redo());
        if (btnClear) btnClear.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your drawing?')) {
                this.renderer && this.renderer.clearDrawGrid();
            }
        });

        // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, B, E, F, I)
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (this.renderer && this.renderer.mode === 'draw') {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) this.renderer.redo();
                    else this.renderer.undo();
                } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    this.renderer.redo();
                } else if (e.key.toLowerCase() === 'b') {
                    document.querySelector('.tool-btn[data-tool="brush"]')?.click();
                } else if (e.key.toLowerCase() === 'e') {
                    document.querySelector('.tool-btn[data-tool="eraser"]')?.click();
                } else if (e.key.toLowerCase() === 'f') {
                    document.querySelector('.tool-btn[data-tool="fill"]')?.click();
                } else if (e.key.toLowerCase() === 'i') {
                    document.querySelector('.tool-btn[data-tool="eyedropper"]')?.click();
                }
            }
        });
    }

    bindQuickHarmonies() {
        // Handled dynamically in updateHarmonySwatches
    }

    bindCopyButtons() {
        document.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                let textToCopy = '';

                if (target === 'input-hex') {
                    textToCopy = `#${document.getElementById('input-hex')?.value || ''}`;
                } else if (target === 'rgb-string') {
                    const r = document.getElementById('input-r')?.value || '0';
                    const g = document.getElementById('input-g')?.value || '0';
                    const b = document.getElementById('input-b')?.value || '0';
                    textToCopy = `rgb(${r}, ${g}, ${b})`;
                } else if (target === 'hsl-string') {
                    const h = document.getElementById('input-h')?.value || '0';
                    const s = document.getElementById('input-s')?.value || '0';
                    const l = document.getElementById('input-l')?.value || '0';
                    textToCopy = `hsl(${h}, ${s}%, ${l}%)`;
                }

                if (textToCopy) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        const originalText = btn.textContent;
                        btn.textContent = 'Copied!';
                        btn.classList.add('copied');
                        setTimeout(() => {
                            btn.textContent = originalText;
                            btn.classList.remove('copied');
                        }, 1500);
                    });
                }
            });
        });
    }

    bindExportButtons() {
        const btnPng = document.getElementById('btn-export-png');
        const btnJson = document.getElementById('btn-export-json');

        if (btnPng) btnPng.addEventListener('click', () => this.renderer && this.renderer.exportPNG());
        if (btnJson) btnJson.addEventListener('click', () => this.renderer && this.renderer.exportJSON());
    }
}

// Start Application on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    new AppController();
});
