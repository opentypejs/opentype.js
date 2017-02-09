/* jshint mocha: true */

'use strict';

var assert = require('assert');
var opentype = require('../src/opentype');

describe('font.js', function() {

    var font;

    var fGlyph = new opentype.Glyph({ name: 'f', unicode: 102, path: new opentype.Path() });
    var iGlyph = new opentype.Glyph({ name: 'i', unicode: 105, path: new opentype.Path() });
    var ffGlyph = new opentype.Glyph({ name: 'f_f', unicode: 0xfb01, path: new opentype.Path() });
    var fiGlyph = new opentype.Glyph({ name: 'f_i', unicode: 0xfb02, path: new opentype.Path() });
    var ffiGlyph = new opentype.Glyph({ name: 'f_f_i', unicode: 0xfb03, path: new opentype.Path() });

    var glyphs = [
        new opentype.Glyph({ name: '.notdef', unicode: 0, path: new opentype.Path() }),
        fGlyph, iGlyph, ffGlyph, fiGlyph, ffiGlyph
    ];

    beforeEach(function() {
        font = new opentype.Font({
            familyName: 'MyFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: glyphs
        });
    });

    describe('stringToGlyphs', function() {
        it('must support standard ligatures', function() {
            assert.deepEqual(font.stringToGlyphs('fi'), [fGlyph, iGlyph]);
            font.substitution.add('liga', { sub: [1, 1, 2], by: 5 });
            font.substitution.add('liga', { sub: [1, 1], by: 3 });
            font.substitution.add('liga', { sub: [1, 2], by: 4 });
            assert.deepEqual(font.stringToGlyphs('ff'), [ffGlyph]);
            assert.deepEqual(font.stringToGlyphs('fi'), [fiGlyph]);
            assert.deepEqual(font.stringToGlyphs('ffi'), [ffiGlyph]);
            assert.deepEqual(font.stringToGlyphs('fffiffif'), [ffGlyph, fiGlyph, ffiGlyph, fGlyph]);
        });
    });

});
