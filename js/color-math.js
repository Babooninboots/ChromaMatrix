/**
 * ChromaMatrix Pro — Color Mathematics & Conversions
 * High-precision algorithms for HEX, RGB, HSL, WCAG contrast, and matrix interpolation.
 * Attached to window.ColorMath to enable direct file:// protocol execution without CORS/module restrictions.
 */

// ==========================================
// 1. Color Parsing & Validation
// ==========================================

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function cleanHex(hex) {
    if (!hex) return '000000';
    let cleaned = hex.toString().trim().replace(/^#/, '');
    if (cleaned.length === 3) {
        cleaned = cleaned.split('').map(char => char + char).join('');
    }
    if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
        return null;
    }
    return cleaned.toUpperCase();
}

function isValidHex(hex) {
    return cleanHex(hex) !== null;
}

// ==========================================
// 2. Color Conversions (HEX <-> RGB <-> HSL)
// ==========================================

function hexToRgb(hex) {
    const cleaned = cleanHex(hex) || '000000';
    const num = parseInt(cleaned, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function rgbToHex(r, g, b) {
    const rc = clamp(Math.round(r), 0, 255);
    const gc = clamp(Math.round(g), 0, 255);
    const bc = clamp(Math.round(b), 0, 255);
    return ((1 << 24) + (rc << 16) + (gc << 8) + bc).toString(16).slice(1).toUpperCase();
}

function rgbToHsl(r, g, b) {
    r = clamp(r, 0, 255) / 255;
    g = clamp(g, 0, 255) / 255;
    b = clamp(b, 0, 255) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;

    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function hexToHsl(hex) {
    const rgb = hexToRgb(hex);
    return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

function hslToHex(h, s, l) {
    const rgb = hslToRgb(h, s, l);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// ==========================================
// 3. WCAG Contrast & Readability
// ==========================================

function getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(rgb1, rgb2) {
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

function evaluateWcag(ratio) {
    if (ratio >= 7) return { label: 'AAA', className: 'badge-pass' };
    if (ratio >= 4.5) return { label: 'AA', className: 'badge-pass' };
    if (ratio >= 3) return { label: 'AA Large', className: 'badge-warn' };
    return { label: 'Fail', className: 'badge-fail' };
}

// ==========================================
// 4. Matrix Color Generators
// ==========================================

/**
 * Generates a Color Family Matrix for the selected Hue.
 * X axis varies Saturation within ±20% of Master color (clamped to 0..100).
 * Y axis varies Lightness within ±20% of Master color (clamped to 0..100).
 * If an edge reaches 0 or 100%, that edge is set to 0 or 100% and step size recalculates,
 * ensuring the Master color is always positioned at the center of the matrix.
 */
function generateFamilyMatrix(baseHex, cols, rows) {
    const baseHsl = hexToHsl(baseHex);
    const matrix = [];
    
    // Range is -20% to +20% of Master color, clamped to [0, 100]
    const minS = clamp(baseHsl.s - 20, 0, 100);
    const maxS = clamp(baseHsl.s + 20, 0, 100);
    const minL = clamp(baseHsl.l - 20, 0, 100);
    const maxL = clamp(baseHsl.l + 20, 0, 100);

    // Center index where Master color sits
    const cCenter = Math.floor((cols - 1) / 2);
    const rCenter = Math.floor((rows - 1) / 2);

    for (let r = 0; r < rows; r++) {
        const rowData = [];
        for (let c = 0; c < cols; c++) {
            const h = baseHsl.h;
            
            // Saturation: piecewise linear so c=0 -> minS, c=cCenter -> baseHsl.s, c=cols-1 -> maxS
            let s;
            if (c <= cCenter) {
                const step = cCenter > 0 ? (baseHsl.s - minS) / cCenter : 0;
                s = clamp(Math.round(minS + c * step), 0, 100);
            } else {
                const step = (cols - 1 - cCenter) > 0 ? (maxS - baseHsl.s) / (cols - 1 - cCenter) : 0;
                s = clamp(Math.round(baseHsl.s + (c - cCenter) * step), 0, 100);
            }

            // Lightness: r=rows-1 (bottom) -> minL, r=rCenter -> baseHsl.l, r=0 (top) -> maxL
            let l;
            if (r >= rCenter) {
                // Bottom half of matrix (r from rCenter down to rows-1)
                const step = (rows - 1 - rCenter) > 0 ? (baseHsl.l - minL) / (rows - 1 - rCenter) : 0;
                l = clamp(Math.round(baseHsl.l - (r - rCenter) * step), 0, 100);
            } else {
                // Top half of matrix (r from 0 down to rCenter)
                const step = rCenter > 0 ? (maxL - baseHsl.l) / rCenter : 0;
                l = clamp(Math.round(maxL - r * step), 0, 100);
            }

            const hex = hslToHex(h, s, l);
            const rgb = hslToRgb(h, s, l);
            const closest = window.ColorNames ? window.ColorNames.findClosest(`#${hex}`) : null;
            
            rowData.push({
                hex: `#${hex}`,
                rgb: rgb,
                hsl: { h, s, l },
                col: c,
                row: r,
                closest: closest
            });
        }
        matrix.push(rowData);
    }

    // Attach step sizes for UI display (average step across matrix)
    matrix.stepSat = cols > 1 ? (maxS - minS) / (cols - 1) : 0;
    matrix.stepLight = rows > 1 ? (maxL - minL) / (rows - 1) : 0;
    
    return matrix;
}

/**
 * Generates a Color Range Matrix between Top-Left (startHex) and Bottom-Right (endHex).
 * Changes Hue along the diagonal (shortest angular path or linear).
 * Changes Saturation along X and Lightness along Y.
 */
function generateRangeMatrix(startHex, endHex, cols, rows, shortestHue = true) {
    const startHsl = hexToHsl(startHex);
    const endHsl = hexToHsl(endHex);
    const matrix = [];

    // Calculate Hue difference
    let deltaH = endHsl.h - startHsl.h;
    if (shortestHue) {
        if (deltaH > 180) deltaH -= 360;
        else if (deltaH < -180) deltaH += 360;
    }

    for (let r = 0; r < rows; r++) {
        const rowData = [];
        const yProgress = rows > 1 ? r / (rows - 1) : 0;

        for (let c = 0; c < cols; c++) {
            const xProgress = cols > 1 ? c / (cols - 1) : 0;
            
            // Diagonal progress for Hue: average of x and y progress
            const diagProgress = (xProgress + yProgress) / 2;

            let h = Math.round((startHsl.h + diagProgress * deltaH + 360) % 360);
            // Saturation varies along X axis
            let s = Math.round(startHsl.s + xProgress * (endHsl.s - startHsl.s));
            // Lightness varies along Y axis
            let l = Math.round(startHsl.l + yProgress * (endHsl.l - startHsl.l));

            s = clamp(s, 0, 100);
            l = clamp(l, 0, 100);

            const hex = hslToHex(h, s, l);
            const rgb = hslToRgb(h, s, l);
            const closest = window.ColorNames ? window.ColorNames.findClosest(`#${hex}`) : null;

            rowData.push({
                hex: `#${hex}`,
                rgb: rgb,
                hsl: { h, s, l },
                col: c,
                row: r,
                closest: closest
            });
        }
        matrix.push(rowData);
    }
    return matrix;
}

// Export to global scope
window.ColorMath = {
    clamp,
    cleanHex,
    isValidHex,
    hexToRgb,
    rgbToHex,
    rgbToHsl,
    hslToRgb,
    hexToHsl,
    hslToHex,
    getLuminance,
    getContrastRatio,
    evaluateWcag,
    generateFamilyMatrix,
    generateRangeMatrix
};
