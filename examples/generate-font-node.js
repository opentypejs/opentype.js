// This example shows how to create a font from scratch using node.js.

'use strict';

var opentype = require('../src/opentype');

// These are the global measurements of the typeface.
var UNITS_PER_EM = 1000;
var ASCENDER = 800;
var DESCENDER = -200;
var SCALE = 80;

// The glyphs are defined as simple, single-contour paths.
var GLYPH_MAP = {
    A: [[0, 0], [4, 10], [8, 0]],
    B: [[0, 0], [0, 10], [5, 10], [5, 5], [7, 5], [7, 0]],
    C: [[0, 0], [0, 10], [8, 10], [8, 6], [3, 6], [3, 4], [8, 4], [8, 0]],
    D: [[0, 0], [0, 3], [2, 3], [2, 7], [0, 7], [0, 10], [8, 10], [8, 0]],
    E: [[0, 0], [0, 10], [8, 10], [8, 7], [3, 7], [3, 6], [5, 6], [5, 4], [3, 4], [3, 3], [8, 3], [8, 0]],
    F: [[0, 0], [0, 3], [0, 10], [8, 10], [8, 7], [3, 7], [3, 6], [5, 6], [5, 3], [3, 3], [3, 0]],
    G: [[0, 0], [0, 3], [0, 10], [8, 10], [8, 7], [3, 7], [3, 3], [5, 3], [5, 5], [8, 5], [8, 0]],
    H: [[0, 0], [0, 3], [0, 7], [0, 10], [3, 10], [3, 7], [5, 7], [5, 10], [8, 10], [8, 0], [5, 0], [5, 3], [3, 3], [3, 0]],
    I: [[0, 0], [0, 10], [3, 10], [3, 0]],
    J: [[0, 0], [0, 3], [4, 3], [4, 10], [7, 10], [7, 0]],
    K: [[0, 0], [0, 10], [3, 10], [3, 7], [5, 10], [8, 10], [5, 5], [8, 0], [5, 0], [3, 3], [3, 0]],
    L: [[0, 0], [0, 10], [3, 10], [3, 3], [7, 3], [7, 0]],
    M: [[0, 0], [0, 10], [3, 10], [4, 8], [5, 10], [8, 10], [8, 0], [5, 0], [5, 4], [4, 3], [3, 4], [3, 0]],
    N: [[0, 0], [0, 10], [3, 10], [3, 9], [5, 7], [5, 10], [8, 10], [8, 0], [5, 0], [5, 3], [3, 5], [3, 0]],
    O: [[0, 0], [0, 10], [7, 10], [7, 0]],
    P: [[0, 0], [0, 10], [7, 10], [7, 4], [3, 4], [3, 0]],
    Q: [[0, 0], [0, 10], [7, 10], [7, 0], [6, 0], [7, -1], [4, -1], [3, 0]],
    R: [[0, 0], [0, 10], [7, 10], [7, 4], [5, 4], [7, 0], [4, 0], [3, 2], [3, 0]],
    S: [[7, 10], [7, 7], [3, 7], [3, 6], [7, 6], [7, 0], [0, 0], [0, 3], [4, 3], [4, 4], [0, 4], [0, 10]],
    T: [[2, 0], [2, 7], [0, 7], [0, 10], [7, 10], [7, 7], [5, 7], [5, 0]],
    U: [[0, 0], [0, 10], [3, 10], [3, 3], [5, 3], [5, 10], [8, 10], [8, 0]],
    V: [[0, 10], [3, 10], [4, 6], [5, 10], [8, 10], [5, 0], [3, 0]],
    W: [[0, 10], [3, 10], [4, 6], [5, 8], [6, 6], [7, 10], [10, 10], [8, 0], [6, 0], [5, 3], [4, 0], [2, 0]],
    X: [[0, 10], [3, 10], [4, 8], [5, 10], [8, 10], [5, 5], [8, 0], [5, 0], [4, 2], [3, 0], [0, 0], [3, 5]],
    Y: [[0, 10], [3, 10], [4, 8], [5, 10], [8, 10], [5, 5], [5, 0], [3, 0], [3, 5]],
    Z: [[0, 10], [7, 10], [7, 7], [3, 3], [7, 3], [7, 0], [0, 0], [0, 3], [4, 7], [0, 7]],
    _: [[0, 0], [0, 1], [8, 1], [8, 0]]
};

// We map between the character and the internal name.
var TTF_NAME_MAP = { _: 'underscore' };

// The notdefGlyph always needs to be included.
var notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    advanceWidth: 650,
    path: new opentype.Path()
});

// Our glyph map can't properly encode a space character, so we make one here.
var spaceGlyph = new opentype.Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth: 10 * SCALE,
    path: new opentype.Path()
});

var glyphs = [notdefGlyph, spaceGlyph];

// Loop through the glyph map and encode all glyphs.
var glyphNames = Object.keys(GLYPH_MAP);
for (var i = 0; i < glyphNames.length; i++) {
    var glyphName = glyphNames[i];
    // Do a conversion from the character name to the correct TrueType name.
    var ttfName = TTF_NAME_MAP[glyphName] || glyphName;

    // Create a path by looping over all the points and multiplying by the SCALE.
    var path = new opentype.Path();
    var points = GLYPH_MAP[glyphName];
    // Remember the width of the character, to set the advanceWidth.
    var w = 0;
    for (var j = 0; j < points.length; j++) {
        var x = points[j][0];
        var y = points[j][1];
        if (j === 0) {
            path.moveTo(x * SCALE, y * SCALE);
        } else {
            path.lineTo(x * SCALE, y * SCALE);
        }
        w = Math.max(w, x);
    }

    // Create the glyph. The advanceWidth is the widest part of the letter + 1.
    var glyph = new opentype.Glyph({
        name: ttfName,
        unicode: glyphName.charCodeAt(0),
        advanceWidth: (w + 1) * SCALE,
        path: path
    });
    glyphs.push(glyph);
}

// Create the font using measurements + glyphs defined above.
var font = new opentype.Font({
    familyName: 'Pyramid',
    styleName: 'Regular',
    unitsPerEm: UNITS_PER_EM,
    ascender: ASCENDER,
    descender: DESCENDER,
    glyphs: glyphs});

// Download the font. The name will be generated automatically.
// (<FamilyName>-<StyleName>.otf, e.g. Pyramid-Regular.otf)
font.download();
