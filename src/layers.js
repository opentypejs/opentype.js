import { binarySearch/*, binarySearchIndex, binarySearchInsert*/ } from './util.js';

function layerLoader(font, glyph) {
    const layers = [];
    const colr = font.tables.colr;
    const cpal = font.tables.cpal;
    /** ignore colr table if no cpal table is present
     * @see https://learn.microsoft.com/en-us/typography/opentype/spec/colr#:~:text=If%20the%20COLR%20table%20is%20present%20in%20a%20font%20but%20no%20CPAL%20table%20exists,%20then%20the%20COLR%20table%20is%20ignored.
     */
    if ( ! colr || ! cpal ) {
        return layers;
    }

    const baseGlyph = binarySearch(colr.baseGlyphRecords, 'glyphID', glyph.index);
    
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

// function updateColrTable(font, glyphIndex, layers) {
//     // Ensure the COLR table exists with the correct structure
//     if (!font.tables.colr) {
//         font.tables.colr = {
//             version: 0,
//             baseGlyphRecords: [],
//             layerRecords: [],
//         };
//     }
//     const colr = font.tables.colr;

//     // Use binarySearchIndex to find the index of the baseGlyphRecord
//     let index = binarySearchIndex(colr.baseGlyphRecords, 'glyphID', glyphIndex);

//     // If baseGlyphRecord doesn't exist, create and insert one at the correct position
//     if (index === -1) {
//         const newBaseGlyphRecord = { glyphID: glyphIndex, firstLayerIndex: colr.layerRecords.length, numLayers: 0 };
//         binarySearchInsert(colr.baseGlyphRecords, 'glyphID', newBaseGlyphRecord);
//         // Update the index after insertion
//         index = binarySearchIndex(colr.baseGlyphRecords, 'glyphID', glyphIndex);
//     }

//     const baseGlyphRecord = colr.baseGlyphRecords[index];

//     const originalNumLayers = baseGlyphRecord.numLayers;
//     const newNumLayers = layers.length;
//     const layerDiff = newNumLayers - originalNumLayers;

//     // Adjust the layer records accordingly
//     if (layerDiff > 0) {
//         // Add new layers
//         const newLayers = layers.slice(originalNumLayers).map(layer => ({
//             glyphID: layer.glyph.id,
//             paletteIndex: layer.paletteIndex,
//         }));
//         colr.layerRecords.splice(baseGlyphRecord.firstLayerIndex + originalNumLayers, 0, ...newLayers);
//     } else if (layerDiff < 0) {
//         // Remove excess layers
//         colr.layerRecords.splice(baseGlyphRecord.firstLayerIndex + newNumLayers, -layerDiff);
//     }

//     // Update existing layers
//     for (let i = 0; i < Math.min(originalNumLayers, newNumLayers); i++) {
//         colr.layerRecords[baseGlyphRecord.firstLayerIndex + i] = {
//             glyphID: layers[i].glyph.id,
//             paletteIndex: layers[i].paletteIndex,
//         };
//     }

//     // Update the numLayers for the baseGlyphRecord
//     baseGlyphRecord.numLayers = newNumLayers;

//     // Adjust firstLayerIndex for subsequent baseGlyphRecords only if there's an actual change
//     if (layerDiff !== 0) {
//         for (let i = index + 1; i < colr.baseGlyphRecords.length; i++) {
//             colr.baseGlyphRecords[i].firstLayerIndex += layerDiff;
//         }
//     }
// }

export { layerLoader };