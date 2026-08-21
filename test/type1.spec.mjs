import assert from 'assert';
import { parse } from '../src/opentype.mjs';
import { readFileSync } from 'fs';

const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('type1.mjs', function() {
    const files = {
        pfa: './test/fonts/TestType1.pfa',
        pfb: './test/fonts/TestType1.pfb'
    };

    Object.keys(files).forEach(function(kind) {
        describe(kind.toUpperCase() + ' parsing', function() {
            let font;
            before(function() {
                font = loadSync(files[kind]);
            });

            it('parses as a Type 1 font', function() {
                assert.equal(font.outlinesFormat, 'type1');
                assert.equal(font.unitsPerEm, 1000);
                assert.equal(font.numGlyphs, 4);
            });

            it('reads font names', function() {
                assert.equal(font.getEnglishName('fontFamily'), 'TestType1');
                assert.equal(font.getEnglishName('postScriptName'), 'TestType1');
            });

            it('maps characters to glyphs by Unicode', function() {
                const a = font.charToGlyph('A');
                assert.equal(a.name, 'A');
                assert.equal(a.index, 2);
                assert.equal(a.unicode, 0x41);
            });

            it('decodes glyph outlines and metrics', function() {
                const a = font.charToGlyph('A');
                assert.equal(a.advanceWidth, 700);
                // rectangle: moveTo + 3 lineTo + close
                const kinds = a.path.commands.map(c => c.type).join('');
                assert.equal(kinds, 'MLLLZ');
                const bb = a.getBoundingBox();
                assert.deepEqual(
                    [bb.x1, bb.y1, bb.x2, bb.y2],
                    [100, 0, 600, 700]
                );
            });

            it('resolves glyphs by name', function() {
                assert.equal(font.nameToGlyphIndex('B'), 3);
                assert.equal(font.glyphNames.glyphIndexToName(3), 'B');
            });

            it('keeps a blank space glyph with its advance width', function() {
                const space = font.charToGlyph(' ');
                assert.equal(space.name, 'space');
                assert.equal(space.advanceWidth, 500);
                assert.equal(space.path.commands.length, 0);
            });

            it('renders a text path', function() {
                const path = font.getPath('AB', 0, 0, 72);
                assert.ok(path.commands.length > 0);
            });
        });
    });

    it('produces identical geometry from PFA and PFB', function() {
        const a = loadSync(files.pfa).charToGlyph('A').path.toPathData(3);
        const b = loadSync(files.pfb).charToGlyph('A').path.toPathData(3);
        assert.equal(a, b);
    });

    it('round-trips through OTF export', function() {
        const font = loadSync(files.pfa);
        const buffer = font.toArrayBuffer();
        const reparsed = parse(buffer);
        assert.equal(reparsed.outlinesFormat, 'cff');
        assert.equal(reparsed.numGlyphs, font.numGlyphs);
        assert.equal(reparsed.charToGlyph('A').advanceWidth, 700);
        assert.equal(
            reparsed.charToGlyph('A').path.toPathData(3),
            font.charToGlyph('A').path.toPathData(3)
        );
    });
});
