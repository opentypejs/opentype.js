import { binarySearch, binarySearchIndex, binarySearchInsert } from './util.js';

export class LayerManager {
    // private properties don't work with reify
    // @TODO: refactor once we migrated to ES6 modules, see https://github.com/opentypejs/opentype.js/pull/579
    // #font = null;

    constructor(font) {
        this.font = font;
    }

    /**
     * Mainly used internally. Ensures that the COLR table exists and is populated with default values
     * @returns the LayerManager's font instance for chaining
     */
    ensureCOLR() {
        if (!this.font.tables.colr) {
            this.font.tables.colr = {
                version: 0,
                baseGlyphRecords: [],
                layerRecords: [],
            };
        }

        return this.font;
    }

    /**
     * Gets the layers for a specific glyph
     * @param {integer} glyphIndex
     * @returns {Array<Object>} array of layer objects {glyph, paletteIndex}
     */
    get(glyphIndex) {
        const font = this.font;
        const layers = [];
        const colr = font.tables.colr;
        const cpal = font.tables.cpal;
        /** ignore colr table if no cpal table is present
         * @see https://learn.microsoft.com/en-us/typography/opentype/spec/colr#:~:text=If%20the%20COLR%20table%20is%20present%20in%20a%20font%20but%20no%20CPAL%20table%20exists,%20then%20the%20COLR%20table%20is%20ignored.
         */
        if ( ! colr || ! cpal ) {
            return layers;
        }
    
        const baseGlyph = binarySearch(colr.baseGlyphRecords, 'glyphID', glyphIndex);
        
        if ( ! baseGlyph ) {
            return layers;
        }
        
        const firstIndex = baseGlyph.firstLayerIndex;
        const numLayers = baseGlyph.numLayers;
    
        for( let l = 0; l < numLayers; l++ ) {
            const layer = colr.layerRecords[firstIndex + l];
            layers.push({
                glyph: font.glyphs.get(layer.glyphID),
                paletteIndex: layer.paletteIndex,
            });
        }
    
        return layers;
    }

    /**
     * Adds one or more layers to a glyph, at the end or at a specific position.
     * @param {integer} glyphIndex glyph index to add the layer(s) to.
     * @param {Array|Object} layers layer object {glyph, paletteIndex}/{glyphID, paletteIndex} or array of layer objects.
     * @param {integer?} position position to insert the layers at (will default to adding at the end).
     */
    add(glyphIndex, layers, position) {
        // Get the current layers for the glyph.
        const currentLayers = this.get(glyphIndex);

        // Normalize layers to an array.
        layers = Array.isArray(layers) ? layers : [layers];

        // Determine the insertion position. If not specified, append to the end.
        if (position === undefined || position === Infinity || position > currentLayers.length) {
            position = currentLayers.length;
        } else if (position < 0) {
            position = (currentLayers.length + 1) + (position % (currentLayers.length + 1));
            if (position >= currentLayers.length + 1) {
                position -= (currentLayers.length + 1);
            }
        }

        // Build a new layers array with the additional layer(s) inserted.
        const newLayers = [];
        for (let i = 0; i < position; i++) {
            const glyphID = Number.isInteger(currentLayers[i].glyph) ? currentLayers[i].glyph : currentLayers[i].glyph.index;
            newLayers.push({
                glyphID,
                paletteIndex: currentLayers[i].paletteIndex,
            });
        }
        for (const layer of layers) {
            const glyphID = Number.isInteger(layer.glyph) ? layer.glyph : layer.glyph.index;
            newLayers.push({
                glyphID,
                paletteIndex: layer.paletteIndex,
            });
        }
        for (let i = position; i < currentLayers.length; i++) {
            const glyphID = Number.isInteger(currentLayers[i].glyph) ? currentLayers[i].glyph : currentLayers[i].glyph.index;
            newLayers.push({
                glyphID,
                paletteIndex: currentLayers[i].paletteIndex,
            });
        }
        
        // Update the COLR table with the new layers array.
        this.updateColrTable(glyphIndex, newLayers);
    }

    /**
     * Sets a color glyph layer's paletteIndex property to a new index
     * @param {integer} glyphIndex glyph in the font by zero-based glyph index
     * @param {integer} layerIndex layer in the glyph by zero-based layer index
     * @param {integer} paletteIndex new color to set for the layer by zero-based index in any palette
     */
    setPaletteIndex(glyphIndex, layerIndex, paletteIndex) {
        let layers = this.get(glyphIndex);
        if (layers[layerIndex]) {
            layers = layers.map((layer, index) => ({
                glyphID: layer.glyph.index,
                paletteIndex: index === layerIndex ? paletteIndex : layer.paletteIndex,
            }));

            this.updateColrTable(glyphIndex, layers);
        } else {
            console.error('Invalid layer index');
        }
    }

    /**
     * Removes one or more layers from a glyph.
     * @param {integer} glyphIndex glyph index to remove the layer(s) from
     * @param {integer} start index to remove the layer at
     * @param {integer?} end (optional) if provided, removes all layers from start index to (and including) end index
     */
    remove(glyphIndex, start, end = start) {
        // Get the current layers for the glyph.
        let currentLayers = this.get(glyphIndex);
    
        // Convert to the expected format for updateColrTable if necessary.
        currentLayers = currentLayers.map(layer => ({
            glyphID: layer.glyph.index,
            paletteIndex: layer.paletteIndex,
        }));
    
        // Directly remove the specified range from the currentLayers array.
        // Splice modifies the array in place and removes elements between start and end indices.
        currentLayers.splice(start, end - start + 1);
    
        // Update the COLR table with the modified layers array.
        this.updateColrTable(glyphIndex, currentLayers);
    }

    /**
     * Mainly used internally. Mainly used internally. Updates the colr table, adding a baseGlyphRecord if needed,
     * ensuring that it's inserted at the correct position, updating numLayers, and adjusting firstLayerIndex values
     * for all baseGlyphRecords according to any deletions or insertions.
     * @param {integer} glyphIndex 
     * @param {Array<Object>} layers array of layer objects {glyphID, paletteIndex}
     */
    updateColrTable(glyphIndex, layers) {
        // Ensure the COLR table exists with the correct structure
        this.ensureCOLR();

        const font = this.font;
        const colr = font.tables.colr;
    
        // Use binarySearchIndex to find the index of the baseGlyphRecord
        let index = binarySearchIndex(colr.baseGlyphRecords, 'glyphID', glyphIndex);
        const addBaseGlyph = index === -1;
    
        // If baseGlyphRecord doesn't exist, create and insert one at the correct position
        if (addBaseGlyph) {
            const newBaseGlyphRecord = { glyphID: glyphIndex, firstLayerIndex: colr.layerRecords.length, numLayers: 0 };
            index = binarySearchInsert(colr.baseGlyphRecords, 'glyphID', newBaseGlyphRecord);
        }

        const baseGlyphRecord = colr.baseGlyphRecords[index];
    
        const originalNumLayers = baseGlyphRecord.numLayers;
        const newNumLayers = layers.length;
        const layerDiff = newNumLayers - originalNumLayers;
    
        // Adjust the layer records accordingly
        if (layerDiff > 0) {
            // Add new layers
            const newLayers = layers.slice(originalNumLayers).map(layer => ({
                glyphID: layer.glyphID,
                paletteIndex: layer.paletteIndex,
            }));
            colr.layerRecords.splice(baseGlyphRecord.firstLayerIndex + originalNumLayers, 0, ...newLayers);
        } else if (layerDiff < 0) {
            // Remove excess layers
            colr.layerRecords.splice(baseGlyphRecord.firstLayerIndex + newNumLayers, -layerDiff);
        }
    
        // Update existing layers
        for (let i = 0; i < Math.min(originalNumLayers, newNumLayers); i++) {
            colr.layerRecords[baseGlyphRecord.firstLayerIndex + i] = {
                glyphID: layers[i].glyphID,
                paletteIndex: layers[i].paletteIndex,
            };
        }
    
        // Update the numLayers for the baseGlyphRecord
        baseGlyphRecord.numLayers = newNumLayers;

        // Adjust firstLayerIndex for baseGlyphRecords
        if (layerDiff !== 0) {
            for (let i = 0; i < colr.baseGlyphRecords.length; i++) {
                const sibling = colr.baseGlyphRecords[i];
                if (i === index || sibling.firstLayerIndex < baseGlyphRecord.firstLayerIndex) continue;
                colr.baseGlyphRecords[i].firstLayerIndex += layerDiff;
            }
        }
    }
}
