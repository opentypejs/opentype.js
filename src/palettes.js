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

    constructor(font) {
        /**
        * @type {integer} CPAL color used to (pre)fill unset colors in a palette.
        * Format 0xBBGGRRAA
        */
        this.defaultValue = 0x000000FF;
        this.font = font;
    }

    cpal() {
        if (this.font.tables && this.font.tables.cpal) {
            return this.font.tables.cpal;
        }
        return false;
    }

    /**
     * 
     * @param {string} colorFormat 
     * @returns {Array<Array>}
     */
    getAll(colorFormat) {
        const palettes = [];
        if (!this.cpal()) return palettes;
    
        for(let i = 0; i < this.cpal().colorRecordIndices.length; i++) {
            const startIndex = this.cpal().colorRecordIndices[i];
            const paletteColors = [];
            for(let j = startIndex; j < startIndex + this.cpal().numPaletteEntries; j++) {
                paletteColors.push(formatColor(this.cpal().colorRecords[j], colorFormat || 'hexa'));
            }
            palettes.push(paletteColors);
        }
    
        return palettes;
    }

    // toCPALcolor(color) {
    toCPALcolor(color) {
        if (Array.isArray(color)) {
            return color.map((color) => parseColor(color, 'raw'));
        }

        return parseColor(color, 'raw');
    }

    // fillPalette(colors, colorCount = this.cpal().numPaletteEntries) {
    fillPalette(colors, colorCount = this.cpal().numPaletteEntries) {
        return Object.assign(Array(colorCount).fill(this.defaultValue), this.toCPALcolor(colors));
    }

    /**
     * Extend existing palettes and numPaletteEntries by a number of color slots
     * @param {integer} num 
     */
    extend(num) {
        if(this.ensureCPAL(Array(num).fill(this.defaultValue))) {
            return;
        }

        const newCount = this.cpal().numPaletteEntries+ num;

        const palettes = this.getAll()
            .map(palette => this.fillPalette(palette, newCount));
        
        this.cpal().numPaletteEntries = newCount;
        this.cpal().colorRecords = this.toCPALcolor(palettes.flat());
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
    getColor(index, paletteIndex, colorFormat = 'hexa') {
        return getPaletteColor(this.font, index, paletteIndex, colorFormat);
    }

    /**
     * Set a color on a specific palette by its zero-based index
     * @param {integer} index 
     * @param {string|integer} color
     * @param {integer} paletteIndex
     * @returns 
     */
    setColor(index, color, paletteIndex = 0) {
        const palettes = this.getAll('raw');
        palettes[paletteIndex][index] = this.toCPALcolor(color);
        this.cpal().colorRecords = palettes.flat();
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

        const colorCount = this.cpal().numPaletteEntries;

        if (colors && colors.length) {
            colors = this.toCPALcolor(colors);
            if (colors.length > colorCount) {
                this.extend(colors.length - colorCount);
            } else if (colors.length < colorCount) {
                colors = this.fillPalette(colors);
            }
            this.cpal().colorRecordIndices.push(this.cpal().colorRecords.length);
            this.cpal().colorRecords.push(...colors);
        } else {
            this.cpal().colorRecordIndices.push(this.cpal().colorRecords.length);
            this.cpal().colorRecords.push(...Array(colorCount).fill(this.defaultValue));
        }
    }

    /**
     * Makes sure that the CPAL table exists and is populated with default values.
     * @param {Array} colors (optional) colors to populate on creation
     * @returns {Boolean} true if it was created, false if it already existed.
     */
    // ensureCPAL(colors) {
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
}