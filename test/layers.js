import assert  from 'assert';
import Font from '../src/font.js';
import Glyph from '../src/glyph.js';
import Path from '../src/path.js';
// import { parse } from '../src/js';
// import { PaletteManager } from '../src/palettes.js';
// import { readFileSync } from 'fs';
// const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('layers.js', function() {
    // creating the layers from an existing colr table
    // is already sufficiently tested via palettes.js
    
    const trianglePath = new Path();
    trianglePath.moveTo(0, 0);
    trianglePath.lineTo(125, 125);
    trianglePath.lineTo(250, 0);
    trianglePath.close();
    const colorGlyph = new Glyph({index: 0, advanceWidth: 250, yMax: 800, path: trianglePath});
    const squarePath = new Path();
    squarePath.moveTo(25, 50);
    squarePath.lineTo(25, 250);
    squarePath.lineTo(75, 250);
    squarePath.lineTo(125, 250);
    squarePath.lineTo(175, 250);
    squarePath.lineTo(225, 250);
    squarePath.lineTo(225, 50);
    squarePath.lineTo(25, 50);
    squarePath.close();
    const colorGlyphLayer1 = new Glyph({index: 1, path: squarePath, advanceWidth: 250});

    const trianglePath2 = new Path();
    trianglePath2.moveTo(0, 250);
    trianglePath2.lineTo(250, 250);
    trianglePath2.lineTo(125, 125);
    trianglePath2.close();

    const colorGlyphLayer2 = new Glyph({index: 2, path: trianglePath2, advanceWidth: 250});
    const colorGlyphLayer3 = new Glyph({index: 3, path: trianglePath, advanceWidth: 250});

    const colorGlyph2 = new Glyph({index: 4, advanceWidth: 250});

    const font = new Font({
        familyName: 'MyFont',
        styleName: 'Medium',
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        glyphs: [colorGlyph, colorGlyphLayer1, colorGlyphLayer2, colorGlyphLayer3, colorGlyph2]
    });
    font.palettes.add(['#ffaa00','#99cc00','#12345678']);

    
    it('adds layers to a glyph', function() {
        font.layers.add(4, {glyph: colorGlyphLayer1, paletteIndex: 0});
        font.layers.add(4, {glyph: colorGlyphLayer3, paletteIndex: 1}, 0);

        assert.deepEqual(font.tables.colr.baseGlyphRecords, [
            { glyphID: 4, firstLayerIndex: 0, numLayers: 2 },
        ]);

        assert.deepEqual(font.tables.colr.layerRecords, [
            { glyphID: 3, paletteIndex: 1 },
            { glyphID: 1, paletteIndex: 0 },
        ]);
        
        font.layers.add(0, [{glyph: colorGlyphLayer1, paletteIndex: 1},{glyph: colorGlyphLayer2, paletteIndex: 0}]);
        
        assert.deepEqual(font.tables.colr.baseGlyphRecords, [
            { glyphID: 0, firstLayerIndex: 2, numLayers: 2},
            { glyphID: 4, firstLayerIndex: 0, numLayers: 2 },
        ]);
        
        assert.deepEqual(font.tables.colr.layerRecords, [
            { glyphID: 3, paletteIndex: 1 },
            { glyphID: 1, paletteIndex: 0 },
            { glyphID: 1, paletteIndex: 1 },
            { glyphID: 2, paletteIndex: 0 }
        ]);
        
        font.layers.add(0, [{glyph: colorGlyphLayer3, paletteIndex: 2}]);

        assert.deepEqual(font.tables.colr.baseGlyphRecords, [
            { glyphID: 0, firstLayerIndex: 2, numLayers: 3 },
            { glyphID: 4, firstLayerIndex: 0, numLayers: 2 },
        ]);

        assert.deepEqual(font.tables.colr.layerRecords, [
            { "glyphID": 3, "paletteIndex": 1 },
            { "glyphID": 1, "paletteIndex": 0 },
            { "glyphID": 1, "paletteIndex": 1 },
            { "glyphID": 2, "paletteIndex": 0 },
            { "glyphID": 3, "paletteIndex": 2 },
        ]);

        font.layers.add(4, [{glyph: colorGlyphLayer3, paletteIndex: 2}], 1);
        
        assert.deepEqual(font.tables.colr.baseGlyphRecords, [
            { glyphID: 0, firstLayerIndex: 3, numLayers: 3 },
            { glyphID: 4, firstLayerIndex: 0, numLayers: 3 },
        ]);

        assert.deepEqual(font.tables.colr.layerRecords, [
            { "glyphID": 3, "paletteIndex": 1 },
            { "glyphID": 3, "paletteIndex": 2 },
            { "glyphID": 1, "paletteIndex": 0 },
            { "glyphID": 1, "paletteIndex": 1 },
            { "glyphID": 2, "paletteIndex": 0 },
            { "glyphID": 3, "paletteIndex": 2 },
        ]);

    });

    it('removes layers from a glyph', function() {
        font.layers.remove(4, 1, 2);
        
        assert.deepEqual(font.tables.colr.baseGlyphRecords, [
            { glyphID: 0, firstLayerIndex: 1, numLayers: 3 },
            { glyphID: 4, firstLayerIndex: 0, numLayers: 1 },
        ]);

        assert.deepEqual(font.tables.colr.layerRecords, [
            { "glyphID": 3, "paletteIndex": 1 },
            { "glyphID": 1, "paletteIndex": 1 },
            { "glyphID": 2, "paletteIndex": 0 },
            { "glyphID": 3, "paletteIndex": 2 },
        ]);

    });

    it('sets a layer\'s paletteIndex', function() {
        assert.deepEqual(font.layers.get(4)[0].paletteIndex, 1);
        font.layers.setPaletteIndex(4, 0, 2);
        assert.deepEqual(font.layers.get(4)[0].paletteIndex, 2);
        font.layers.setPaletteIndex(0, 1, 1);
        assert.deepEqual(font.tables.colr.layerRecords, [
            { "glyphID": 3, "paletteIndex": 2 },
            { "glyphID": 1, "paletteIndex": 1 },
            { "glyphID": 2, "paletteIndex": 1 },
            { "glyphID": 3, "paletteIndex": 2 },
        ]);

    });

});