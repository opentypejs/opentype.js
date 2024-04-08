import { getPaletteColor, parseColor, formatColor } from './tables/cpal.js';

/**
 * @exports opentype.PaletteManager
 * @class
 * @param {opentype.Font}
 */
export class PaletteManager {
    // private properties don't work with reify
    // @TODO: refactor once we migrated to ES6 modules, see https://github.com/opentypejs/opentype.js/pull/579
    // #font = null;

    /**
     * @type {integer} CPAL color used to (pre)fill unset colors in a palette.
     * Format 0xBBGGRRAA
     */
    // defaultValue = 0x000000FF;

    /**
     * 
     * @param {opentype.Font} font 
     */
    constructor(font) {
        /**
        * @type {integer} CPAL color used to (pre)fill unset colors in a palette.
        * Format 0xBBGGRRAA
        */
        this.defaultValue = 0x000000FF;
        this.font = font;
    }

    /**
     * Returns the font's cpal table object if present
     * @returns {Object}
     */
    cpal() {
        if (this.font.tables && this.font.tables.cpal) {
            return this.font.tables.cpal;
        }
        return false;
    }

    /**
     * Returns an array of arrays of color values for each palette, optionally in a specified color format
     * @param {string} colorFormat 
     * @returns {Array<Array>}
     */
    getAll(colorFormat) {
        const palettes = [];
        const cpal = this.cpal();
        if (!cpal) return palettes;
    
        for(let i = 0; i < cpal.colorRecordIndices.length; i++) {
            const startIndex = cpal.colorRecordIndices[i];
            const paletteColors = [];
            for(let j = startIndex; j < startIndex + cpal.numPaletteEntries; j++) {
                paletteColors.push(formatColor(cpal.colorRecords[j], colorFormat || 'hexa'));
            }
            palettes.push(paletteColors);
        }
    
        return palettes;
    }

    /**
     * Converts a color value string or array of color value strings to CPAL integer color value(s)
     * @param {string|Array<string></string>} color 
     * @returns {integer}
     */
    toCPALcolor(color) {
        if (Array.isArray(color)) {
            return color.map((color) => parseColor(color, 'raw'));
        }

        return parseColor(color, 'raw');
    }

    /**
     * Fills a set of palette colors (from palette index, or a provided array of CPAL color values) with a set of colors, falling back to the default color value, until a given count
     * @param {Array<string>|integer} palette Palette index integer or Array of colors to be filled
     * @param {Array<string|integer>} colors Colors to fill the palette with
     * @param {integer} _colorCount Number of colors to fill the palette with, defaults to the value of the numPaletteEntries field. Used internally by extend() and shouldn't be set manually
     * @returns 
     */
    fillPalette(palette, colors = [], _colorCount = this.cpal().numPaletteEntries) {
        palette = Number.isInteger(palette) ? this.get(palette, 'raw') : palette;
        return Object.assign(Array(_colorCount).fill(this.defaultValue), this.toCPALcolor(palette).concat(this.toCPALcolor(colors)));
    }

    /**
     * Extend existing palettes and numPaletteEntries by a number of color slots
     * @param {integer} num number of additional color slots to add to all palettes
     */
    extend(num) {
        if(this.ensureCPAL(Array(num).fill(this.defaultValue))) {
            return;
        }
        const cpal = this.cpal();

        const newCount = cpal.numPaletteEntries + num;

        const palettes = this.getAll()
            .map(palette => this.fillPalette(palette, [], newCount));
        
        cpal.numPaletteEntries = newCount;
        cpal.colorRecords = this.toCPALcolor(palettes.flat());
        this.updateIndices();
    }

    /**
     * Get a specific palette by its zero-based index
     * @param {integer} paletteIndex 
     * @param {string} [colorFormat='hexa']
     * @returns {Array}
     */
    get(paletteIndex, colorFormat = 'hexa') {
        return this.getAll(colorFormat)[paletteIndex] || null;
    }
    
    /**
     * Get a color from a specific palette by its zero-based index
     * @param {integer} index 
     * @param {integer} paletteIndex
     * @param {string} [colorFormat ='hexa']
     * @returns 
     */
    getColor(index, paletteIndex = 0, colorFormat = 'hexa') {
        return getPaletteColor(this.font, index, paletteIndex, colorFormat);
    }

    /**
     * Set one or more colors on a specific palette by its zero-based index
     * @param {integer} index zero-based color index to start filling from
     * @param {string|integer|Array<string|integer>} color color value or array of color values
     * @param {integer} paletteIndex
     * @returns 
     */
    setColor(index, colors, paletteIndex = 0) {
        index = parseInt(index);
        paletteIndex = parseInt(paletteIndex);
        let palettes = this.getAll('raw');
        let palette = palettes[paletteIndex];
        if (!palette) {
            throw Error(`paletteIndex ${paletteIndex} out of range`);
        }
        
        const cpal = this.cpal();
        const colorCount = cpal.numPaletteEntries;

        if (!Array.isArray(colors)) {
            colors = [colors];
        }

        if (colors.length + index > colorCount) {
            this.extend(colors.length + index - colorCount);
            palettes = this.getAll('raw');
            palette = palettes[paletteIndex];
        }

        for(let i = 0; i < colors.length; i++) {
            palette[i + index] = this.toCPALcolor(colors[i]);
        }
        cpal.colorRecords = palettes.flat();
        this.updateIndices();
    }
    
    /**
     * Add a new palette. 
     * @param {Array} colors (optional) colors to add to the palette, differences to existing palettes will be filled with the defaultValue.
     * @returns 
     */
    add(colors) {
        if (this.ensureCPAL(colors)) {
            return;
        }

        const cpal = this.cpal();
        const colorCount = cpal.numPaletteEntries;
        if (colors && colors.length) {
            colors = this.toCPALcolor(colors);
            if (colors.length > colorCount) {
                this.extend(colors.length - colorCount);
            } else if (colors.length < colorCount) {
                colors = this.fillPalette(colors);
            }
            cpal.colorRecordIndices.push(cpal.colorRecords.length);
            cpal.colorRecords.push(...colors);
        } else {
            cpal.colorRecordIndices.push(cpal.colorRecords.length);
            cpal.colorRecords.push(...Array(colorCount).fill(this.defaultValue));
        }
    }

    /**
     * deletes a palette by its zero-based index
     * @param {integer} paletteIndex 
     */
    delete(paletteIndex) {
        const palettes = this.getAll('raw');
        delete palettes[paletteIndex];
        const cpal = this.cpal();
        cpal.colorRecordIndices.pop();
        cpal.colorRecords = palettes.flat();
    }

    /**
     * Deletes a specific color index in all palettes and updates all layers using that color with the replacement index
     * @param {integer} colorIndex index of the color that should be deleted
     * @param {integer} replacementIndex index (according to the palette before deletion) of the color to replace in layers using the color to be to deleted
     */
    deleteColor(colorIndex, replacementIndex) {
        if(colorIndex === replacementIndex) {
            throw Error('replacementIndex cannot be the same as colorIndex');
        }
        const cpal = this.cpal();
        const palettes = this.getAll('raw');
        const updatedPalettes = [];
        if (replacementIndex > cpal.numPaletteEntries - 1) {
            throw Error(`Replacement index out of range: numPaletteEntries after deletion: ${cpal.numPaletteEntries - 1}, replacementIndex: ${replacementIndex})`);
        }
    
        // Remove color from all palettes
        for (let i = 0; i < palettes.length; i++) {
            const palette = palettes[i];
            const updatedPalette = palette.filter((color, index) => index !== colorIndex);
            updatedPalettes.push(updatedPalette);
        }
    
        // Update paletteIndex in layerRecords of the COLR table
        const colrTable = this.font.tables.colr;
        if (colrTable) {
            const layerRecords = colrTable.layerRecords;
    
            // Adjust paletteIndex in layerRecords
            for (let i = 0; i < layerRecords.length; i++) {
                const currentIndex = layerRecords[i].paletteIndex;
                if (currentIndex > colorIndex) {
                    // If the current index is after the deleted color, adjust it accordingly
                    const shiftAmount = 1; // We're removing one color from each palette
                    layerRecords[i].paletteIndex -= shiftAmount;
                } else if (currentIndex === colorIndex) {
                    // Calculate replacement index shift
                    let replacementShift = 0;
                    for (let j = 0; j < palettes.length; j++) {
                        if (replacementIndex > colorIndex && replacementIndex <= colorIndex + palettes[j].length) {
                            replacementShift++;
                            break;
                        }
                    }
                    // Replace deleted color index with adjusted replacement
                    layerRecords[i].paletteIndex = replacementIndex - replacementShift;
                }
            }
    
            // Reconstruct the COLR table
            this.font.tables.colr = {
                ...colrTable,
                layerRecords: layerRecords,
            };
        }
    
        // Update CPAL table with the modified palettes
        const flattenedPalettes = updatedPalettes.flat();
        for (let i = 0; i < palettes.length; i++) {
            cpal.colorRecordIndices[i] -= i;
        }
        cpal.numPaletteEntries = Math.max(0, cpal.numPaletteEntries - 1);
        cpal.colorRecords = this.toCPALcolor(flattenedPalettes);
    }        

    /**
     * Makes sure that the CPAL table exists and is populated with default values.
     * @param {Array} colors (optional) colors to populate on creation
     * @returns {Boolean} true if it was created, false if it already existed.
     */
    ensureCPAL(colors) {
        if (!this.cpal()) {
            if (!colors || !colors.length) {
                colors = [this.defaultValue];
            } else {
                colors = this.toCPALcolor(colors);
            }

            this.font.tables.cpal = {
                version: 0,
                numPaletteEntries: colors.length,
                colorRecords: colors,
                colorRecordIndices: [0]
            };
            return true;
        }
        return false;
    }

    /**
     * Mainly used internally. Recalculates the colorRecordIndices array based on the numPaletteEntries and number of palettes
     */
    updateIndices() {
        const cpal = this.cpal();
        const paletteCount = Math.ceil(cpal.colorRecords.length/cpal.numPaletteEntries);
        cpal.colorRecordIndices = [];
        for(let i = 0; i < paletteCount; i++) {
            cpal.colorRecordIndices.push(i * cpal.numPaletteEntries);
        }
    }
}