// The `CPAL` define a contiguous list of colors (colorRecords)
// Theses colors must be index by at least one default (0) palette (colorRecordIndices)
// every palettes share the same size (numPaletteEntries) and can overlap to refere the same colors
// https://www.microsoft.com/typography/OTSPEC/cpal.htm

import { Parser } from '../parse.js';
import check from '../check.js';
import table from '../table.js';

// Parse the header `head` table
function parseCpalTable(data, start) {
    const p = new Parser(data, start);
    const version = p.parseShort();
    if(version !== 0x0000) {
        console.warn('Only CPALv0 is currently fully supported.');
    }
    const numPaletteEntries = p.parseShort();
    const numPalettes = p.parseShort();
    const numColorRecords = p.parseShort();
    const colorRecordsArrayOffset = p.parseOffset32();
    const colorRecordIndices = p.parseUShortList(numPalettes);
    p.relativeOffset = colorRecordsArrayOffset;
    const colorRecords = p.parseULongList(numColorRecords);

    p.relativeOffset = colorRecordsArrayOffset;

    return {
        version,
        numPaletteEntries,
        colorRecords,
        colorRecordIndices
    };
}

function makeCpalTable({ version = 0, numPaletteEntries = 0, colorRecords = [], colorRecordIndices = [0] }) {
    check.argument(version === 0, 'Only CPALv0 are supported.');
    check.argument(colorRecords.length, 'No colorRecords given.');
    check.argument(colorRecordIndices.length, 'No colorRecordIndices given.');
    if (colorRecordIndices.length > 1) {
        check.argument(numPaletteEntries, 'Can\'t infer numPaletteEntries on multiple colorRecordIndices');
    }
    return new table.Table('CPAL', [
        { name: 'version', type: 'USHORT', value: version },
        { name: 'numPaletteEntries', type: 'USHORT', value: numPaletteEntries || colorRecords.length },
        { name: 'numPalettes', type: 'USHORT', value: colorRecordIndices.length },
        { name: 'numColorRecords', type: 'USHORT', value: colorRecords.length },
        { name: 'colorRecordsArrayOffset', type: 'ULONG', value: 12 + 2 * colorRecordIndices.length },
        ...colorRecordIndices.map((palette, i) => ({ name: 'colorRecordIndices_' + i, type: 'USHORT', value: palette })),
        ...colorRecords.map((color, i) => ({ name: 'colorRecords_' + i, type: 'ULONG', value: color })),
    ]);
}

function parseCPALColor(bgra) {
    var b = (bgra & 0xFF000000) >> 24;
    var g = (bgra & 0x00FF0000) >> 16;
    var r = (bgra & 0x0000FF00) >> 8;
    var a = bgra & 0x000000FF;
  
    // Adjust for sign extension if negative
    b = (b + 0x100) & 0xFF;
    g = (g + 0x100) & 0xFF;
    r = (r + 0x100) & 0xFF;
    a = ((a + 0x100) & 0xFF) / 255;

    return { b, g, r, a };
}

function getPaletteColor(font, index, palette = 0, colorFormat = 'hexa') {
    if (index == 0xFFFF) {
        return 'currentColor';
    }

    const cpalTable = font && font.tables && font.tables.cpal;
    if (!cpalTable) return 'currentColor';

    if (palette > cpalTable.colorRecordIndices.length - 1) {
        throw new Error(`Palette index out of range (colorRecordIndices.length: ${cpalTable.colorRecordIndices.length}, index: ${index})`);
    }

    if (index > cpalTable.numPaletteEntries) {
        throw new Error(`Color index out of range (numPaletteEntries: ${cpalTable.numPaletteEntries}, index: ${index})`);
    }

    const lookupIndex = cpalTable.colorRecordIndices[palette] + index;
    if (lookupIndex > cpalTable.colorRecords) {
        throw new Error(`Color index out of range (colorRecords.length: ${cpalTable.colorRecords.length}, lookupIndex: ${lookupIndex})`);
    }

    const color = parseCPALColor(cpalTable.colorRecords[lookupIndex]);
    if(colorFormat === 'bgra') {
        return color;
    }
    return formatColor(color, colorFormat);
}

function toHex(d) {
    return ('0' + parseInt(d).toString(16)).slice(-2);
}

function rgbToHSL(bgra) {
    const r = bgra.r/255;
    const g = bgra.g/255;
    const b = bgra.b/255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
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
        h: h * 360,
        s: s * 100,
        l: l * 100
    };
}

function hslToRGB(hsla) {
    let { h, s, l, a } = hsla;
    h = h % 360;
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h <= 360) {
        r = c; g = 0; b = x;
    }
  
    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
        a
    };
}

function bgraToRaw(color) {
    return parseInt(`0x${toHex(color.b)}${toHex(color.g)}${toHex(color.r)}${toHex(color.a * 255)}`, 16);
}

function parseColor(color, targetFormat = 'hexa') {
    const returnRaw = (targetFormat == 'raw' || targetFormat == 'cpal');
    const isRaw = Number.isInteger(color);
    let validFormat = true;
    if (
        (
            isRaw && returnRaw
        ) ||
        color === 'currentColor'
    ) {
        return color;
    } else if (typeof color === 'object') {
        if (targetFormat == 'bgra') {
            return color;
        }
        if (returnRaw) {
            return bgraToRaw(color);
        }
    } else if(!isRaw && /^#([a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(color.trim())) {
        color = color.trim().substring(1);
        switch(color.length) {
            case 3:
                color = {
                    r: parseInt(color[0].repeat(2), 16),
                    g: parseInt(color[1].repeat(2), 16),
                    b: parseInt(color[2].repeat(2), 16),
                    a: 1
                };
                break;
            case 4:
                color = {
                    r: parseInt(color[0].repeat(2), 16),
                    g: parseInt(color[1].repeat(2), 16),
                    b: parseInt(color[2].repeat(2), 16),
                    a: parseInt(color[3].repeat(2), 16) / 255
                };
                break;
            case 6:
                color = {
                    r: parseInt(color[0] + color[1], 16),
                    g: parseInt(color[2] + color[3], 16),
                    b: parseInt(color[4] + color[5], 16),
                    a: 1
                };
                break;
            case 8:
                color = {
                    r: parseInt(color[0] + color[1], 16),
                    g: parseInt(color[2] + color[3], 16),
                    b: parseInt(color[4] + color[5], 16),
                    a: parseInt(color[6] + color[7], 16) / 255,
                };
                break;
        }
        
        if(targetFormat == 'bgra') {
            return color;
        }
    } else if(globalThis.window && globalThis.window.HTMLCanvasElement && /^[a-z]+$/i.test(color)) {
        // assume CSS color name (only works in browser context!)
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = color;
        // may sometimes return rgba() notation, so we need to use formatColor()
        const detectedColor = formatColor(ctx.fillStyle, 'hexa');
        // invalid values will return black, so if that wasn't the input, it's an invalid color name
        if (detectedColor === '#000000ff' && color.toLowerCase() !== 'black') {
            validFormat = false;
        } else {
            color = detectedColor;
        }
    } else {
        color = color.trim();
        const rgbaRegex = /rgba?\(\s*(?:(\d*\.\d+)(%?)|(\d+)(%?))\s*(?:,|\s*)\s*(?:(\d*\.\d+)(%?)|(\d+)(%?))\s*(?:,|\s*)\s*(?:(\d*\.\d+)(%?)|(\d+)(%?))\s*(?:(?:,|\s|\/)\s*(?:(0*(?:\.\d+)?()|0*1(?:\.0+)?())|(?:\.\d+)|(\d+)(%)|(\d*\.\d+)(%)))?\s*\)/;
        if (rgbaRegex.test(color)) {
            const matches = color.match(rgbaRegex).filter((i) => typeof i !== 'undefined');
            color = {
                r: Math.round(parseFloat(matches[1]) / (matches[2] ? 100/255 : 1)),
                g: Math.round(parseFloat(matches[3]) / (matches[4] ? 100/255 : 1)),
                b: Math.round(parseFloat(matches[5]) / (matches[6] ? 100/255 : 1)),
                a: !matches[7] ? 1 : (parseFloat(matches[7]) / (matches[8] ? 100 : 1))
            };
        } else {
            const hslaRegex = /hsla?\(\s*(?:(\d*\.\d+|\d+)(deg|turn|))\s*(?:,|\s*)\s*(?:(\d*\.\d+)%?|(\d+)%?)\s*(?:,|\s*)\s*(?:(\d*\.\d+)%?|(\d+)%?)\s*(?:(?:,|\s|\/)\s*(?:(0*(?:\.\d+)?()|0*1(?:\.0+)?())|(?:\.\d+)|(\d+)(%)|(\d*\.\d+)(%)))?\s*\)/;
            if (hslaRegex.test(color)) {
                const matches = color.match(hslaRegex).filter((i) => typeof i !== 'undefined');
                color = hslToRGB({
                    h: parseFloat(matches[1]) * (matches[2] === 'turn' ? 360 : 1),
                    s: parseFloat(matches[3]),
                    l: parseFloat(matches[4]),
                    a: !matches[5] ? 1 : parseFloat(matches[5]) / (matches[6] ? 100 : 1)
                });
            } else {
                validFormat = false;
            }
        }
    }

    if (!validFormat) {
        throw new Error(`Invalid color format: ${color}`);
    }

    return formatColor(color, targetFormat);
}

function formatColor(bgra, format = 'hexa') {
    if (bgra === 'currentColor') return bgra;  

    if (Number.isInteger(bgra)) {
        if (format == 'raw' || format == 'cpal') {
            return bgra;
        }
        bgra = parseCPALColor(bgra);
    } else if(typeof bgra !== 'object') {
        bgra = parseColor(bgra, 'bgra');  
    }
    
    let hsl = ['hsl', 'hsla'].includes(format) ? rgbToHSL(bgra) : null;

    switch(format) {
        case 'rgba':
            return `rgba(${bgra.r}, ${bgra.g}, ${bgra.b}, ${parseFloat(bgra.a.toFixed(3))})`;
        case 'rgb':
            return `rgb(${bgra.r}, ${bgra.g}, ${bgra.b})`;
        case 'hex':
        case 'hex6':
        case 'hex-6':
            return `#${toHex(bgra.r)}${toHex(bgra.g)}${toHex(bgra.b)}`;
        case 'hexa':
        case 'hex8':
        case 'hex-8':
            return `#${toHex(bgra.r)}${toHex(bgra.g)}${toHex(bgra.b)}${toHex(bgra.a * 255)}`;
        case 'hsl':
            return `hsl(${hsl.h.toFixed(2)}, ${hsl.s.toFixed(2)}%, ${hsl.l.toFixed(2)}%)`;
        case 'hsla':
            return `hsla(${hsl.h.toFixed(2)}, ${hsl.s.toFixed(2)}%, ${hsl.l.toFixed(2)}%, ${parseFloat(bgra.a.toFixed(3))})`;
        case 'bgra':
            return bgra;
        case 'raw':
        case 'cpal':
            return bgraToRaw(bgra);
        default:
            throw new Error('Unknown color format: ' + format);
    }
}

export default { parse: parseCpalTable, make: makeCpalTable, getPaletteColor, parseColor, formatColor };
export { parseCpalTable, makeCpalTable, getPaletteColor, parseColor, formatColor };

