import assert from 'assert';
import { Font, Glyph, Path, loadSync } from '../src/opentype';

describe('font.js', function() {
    let font;

    const fGlyph = new Glyph({name: 'f', unicode: 102, path: new Path(), advanceWidth: 1});
    const iGlyph = new Glyph({name: 'i', unicode: 105, path: new Path(), advanceWidth: 1});
    const ffGlyph = new Glyph({name: 'f_f', unicode: 0xfb01, path: new Path(), advanceWidth: 1});
    const fiGlyph = new Glyph({name: 'f_i', unicode: 0xfb02, path: new Path(), advanceWidth: 1});
    const ffiGlyph = new Glyph({name: 'f_f_i', unicode: 0xfb03, path: new Path(), advanceWidth: 1});

    const glyphs = [
        new Glyph({name: '.notdef', unicode: 0, path: new Path(), advanceWidth: 1}),
        fGlyph, iGlyph, ffGlyph, fiGlyph, ffiGlyph
    ];

    glyphs.forEach((glyph, index) => glyph.index = index);

    beforeEach(function() {
        font = new Font({
            familyName: 'MyFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: 0,
            fsSelection: 42,
            tables: {os2: {achVendID: 'TEST'}},
            glyphs: glyphs
        });
    });

    describe('Font constructor', function() {
        it('accept 0 as descender value', function() {
            assert.equal(font.descender, 0);
        });
        it('tables definition must be supported', function() {
            assert.equal(font.tables.os2.achVendID, 'TEST');
        });
        it('tables definition must blend with default tables values', function() {
            assert.equal(font.tables.os2.usWidthClass, 5);
        });
        it('tables definition can override defaults values', function() {
            assert.equal(font.tables.os2.fsSelection, 42);
        });
        it('tables definition shall be serialized', function() {
            const os2 = font.toTables().tables.find(table => table.tableName === 'OS/2');
            assert.equal(os2.achVendID, 'TEST');
        });
    });

    describe('stringToGlyphIndexes', function() {
        it('must support standard ligatures', function() {
            assert.deepEqual(font.stringToGlyphIndexes('fi'), [fGlyph.index, iGlyph.index]);
            font.substitution.add('liga', { sub: [1, 1, 2], by: 5 });
            font.substitution.add('liga', { sub: [1, 1], by: 3 });
            font.substitution.add('liga', { sub: [1, 2], by: 4 });
            assert.deepEqual(font.stringToGlyphIndexes('ff'), [ffGlyph.index]);
            assert.deepEqual(font.stringToGlyphIndexes('fi'), [fiGlyph.index]);
            assert.deepEqual(font.stringToGlyphIndexes('ffi'), [ffiGlyph.index]);
            assert.deepEqual(font.stringToGlyphIndexes('fffiffif'),
                [ffGlyph.index, fiGlyph.index, ffiGlyph.index, fGlyph.index]);
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
            const vibur = loadSync('./fonts/Vibur.woff');
            const glyphs = vibur.stringToGlyphs('er');
            assert.equal(glyphs.length, 1);
            assert.equal(glyphs[0].name, 'er');
        });

        it('works on fonts with coverage table format 2 on low memory mode', function() {
            const vibur = loadSync('./fonts/Vibur.woff', {lowMemory: true});
            const glyphs = vibur.stringToGlyphs('er');
            assert.equal(glyphs.length, 1);
            assert.equal(glyphs[0].name, 'er');
        });

    });
});
