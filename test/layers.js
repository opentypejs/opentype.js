import assert  from 'assert';
import Font from '../src/font.js';
import Glyph from '../src/glyph.js';
import Path from '../src/path.js';
// import { parse } from '../src/opentype.js';
// import { PaletteManager } from '../src/palettes.js';
// import { readFileSync } from 'fs';
// const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('layers.js', function() {
    // creating the layers from an existing colr table
    // is already sufficiently tested via palettes.js
    
    const colorGlyph = new Glyph({index: 0, advanceWidth: 0});
    const squarePath = new Path();
    squarePath.moveTo(0, 50);
    squarePath.lineTo(0, 250);
    squarePath.lineTo(50, 250);
    squarePath.lineTo(100, 250);
    squarePath.lineTo(150, 250);
    squarePath.lineTo(200, 250);
    squarePath.lineTo(200, 50);
    squarePath.lineTo(0, 50);
    squarePath.close();
    const colorGlyphLayer1 = new Glyph({index: 1, path: squarePath, advanceWidth: 0});

    const font = new Font({
        familyName: 'MyFont',
        styleName: 'Medium',
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        glyphs: [colorGlyph, colorGlyphLayer1]
    });
    font.palettes.add(['#ffaa00','#99cc00','#12345678']);
});