import assert from 'assert';
import { Font, Glyph, Path, loadSync } from '../src/opentype';

describe('font.js', function() {
    var font;

    var fGlyph = new Glyph({ name: 'f', unicode: 102, path: new Path() });
    var iGlyph = new Glyph({ name: 'i', unicode: 105, path: new Path() });
    var ffGlyph = new Glyph({ name: 'f_f', unicode: 0xfb01, path: new Path() });
    var fiGlyph = new Glyph({ name: 'f_i', unicode: 0xfb02, path: new Path() });
    var ffiGlyph = new Glyph({ name: 'f_f_i', unicode: 0xfb03, path: new Path() });

    var glyphs = [
        new Glyph({ name: '.notdef', unicode: 0, path: new Path() }),
        fGlyph, iGlyph, ffGlyph, fiGlyph, ffiGlyph
    ];

    beforeEach(function() {
        font = new Font({
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

        it('works on fonts with coverage table format 2', function() {
            var vibur = loadSync('./fonts/Vibur.woff');
            var glyphs = vibur.stringToGlyphs('er');
            assert.equal(glyphs.length, 1);
            assert.equal(glyphs[0].name, 'er');
        });
    });
});
