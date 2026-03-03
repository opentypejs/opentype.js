import assert from 'assert';
import { unhex } from '../testutil.mjs';
import { Parser } from '../../src/parse.mjs';
import { parseCmapTableFormat14, parseCmapTableFormat0, makeCmapTable } from '../../src/tables/cmap.mjs';
import { Font, Path, Glyph, parse } from '../../src/opentype.mjs';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('tables/cmap.mjs', function() {

    it('can parse a CMAP format 14 table', function() {
        const cmapData =
            '000E 00000045 00000003 ' + // format, length, numVarSelectorRecords
            // varSelector[numVarSelectorRecords]: varSelector, defaultUVSOffset, nonDefaultUVSOffset
            '00FE00 00000000 0000002B' + 
            '0E0100 00000034 00000000' +
            '0E0101 00000000 0000003C' + 
            // varSelector[0] nonDefaultUVS: numUVSMappings
            '00000001 ' +
            // VariationSelector Record: unicodeValue, glyphID
            '002269 0003 ' +
            // varSelector[1] defaultUVS: numUnicodeValueRanges
            '00000001 ' +
            // UnicodeRange Record: startUnicodeValue, additionalCount
            '0082A600 ' +
            // varSelector[2] nonDefaultUVS: numUVSMappings
            '00000001 ' +
            // UnicodeRange Record: startUnicodeValue, additionalCount
            '0082A6 0002';
        const cmap = {};
        const expectedData = {
            '65024': {
                varSelector: 65024,
                nonDefaultUVS: {
                    uvsMappings: {
                        8809: { glyphID: 3, unicodeValue: 8809 }
                    }
                }
            },
            '917760': {
                varSelector: 917760,
                defaultUVS: {
                    ranges: [{ additionalCount: 0, startUnicodeValue: 33446 }]
                }
            },
            '917761': {
                varSelector: 917761,
                nonDefaultUVS: {
                    uvsMappings: {
                        33446: { glyphID: 2, unicodeValue: 33446}
                    }
                }
            }
        };
        const p = new Parser(unhex(cmapData), 0);
        p.skip('uShort'); // skip format
        assert.doesNotThrow(function() { parseCmapTableFormat14(cmap, p); });
        assert.deepEqual(cmap.varSelectorList, expectedData);
    });

    it('can parse CMAP format 0 legacy Mac encoding', function() {
        let font;
        assert.doesNotThrow(function() {
            font = loadSync('./test/fonts/TestCMAPMacTurkish.ttf');
        });
        const testString = '“ABÇĞIİÖŞÜ”abçğıiöşüÄƒ';
        const glyphIds = [];
        const expectedGlyphIds = [200,34,35,126,176,42,178,140,181,145,201,66,67,154,177,222,74,168,182,174,123,184];
        for (let i = 0; i < testString.length; i++) {
            glyphIds.push(font.charToGlyphIndex(testString.charAt(i)));
        }
        assert.deepEqual(glyphIds, expectedGlyphIds);
    });

    it('can parse CMAP table format 13', function() {
        let font;
        assert.doesNotThrow(function() {
            font = loadSync('./test/fonts/TestCMAP13.ttf');
        });
        const testString = 'U\u13EF\u{1203C}\u{1FA00}';
        const glyphIds = font.stringToGlyphIndexes(testString);
        const expectedGlyphIds = [1,2,3,4];
        assert.deepEqual(glyphIds, expectedGlyphIds);
    });

    // Helper: create a mock GlyphSet for makeCmapTable
    function mockGlyphs(glyphDefs) {
        // glyphDefs: array of { unicodes: [number, ...] }
        return {
            length: glyphDefs.length,
            get(i) {
                const def = glyphDefs[i];
                return { ...def, unicode: def.unicodes[0] };
            }
        };
    }

    describe('makeCmapTable segment merging', function() {
        it('merges contiguous codepoints with same delta into one segment', function() {
            // Glyphs: .notdef (index 0), A=65 (index 1), B=66 (index 2), C=67 (index 3)
            // All have contiguous unicodes and contiguous glyph indices → same delta
            const glyphs = mockGlyphs([
                { unicodes: [] },       // .notdef
                { unicodes: [65] },     // A → glyph 1
                { unicodes: [66] },     // B → glyph 2
                { unicodes: [67] },     // C → glyph 3
            ]);

            const t = makeCmapTable(glyphs);
            // Should be 1 merged segment (65-67) + terminator = 2 segments
            assert.equal(t.segments.length, 2, `Expected 2 segments (1 merged + terminator), got ${t.segments.length}`);
            // Verify the merged segment covers the full range
            assert.equal(t.segments[0].start, 65);
            assert.equal(t.segments[0].end, 67);
        });

        it('does NOT merge non-contiguous codepoints', function() {
            // A=65 (index 1), C=67 (index 2) — gap in codepoints
            const glyphs = mockGlyphs([
                { unicodes: [] },
                { unicodes: [65] },     // A → glyph 1
                { unicodes: [67] },     // C → glyph 2 (skips B=66)
            ]);

            const t = makeCmapTable(glyphs);
            // 2 separate segments + terminator = 3
            assert.equal(t.segments.length, 3);
        });

        it('does NOT merge segments with different deltas', function() {
            // A=65 (index 1), B=66 (index 3) — contiguous codepoints but non-contiguous glyph indices
            const glyphs = mockGlyphs([
                { unicodes: [] },
                { unicodes: [65] },     // A → glyph 1, delta = -(65-1) = -64
                { unicodes: [] },       // glyph 2 (no unicode)
                { unicodes: [66] },     // B → glyph 3, delta = -(66-3) = -63
            ]);

            const t = makeCmapTable(glyphs);
            // Different deltas → 2 separate segments + terminator = 3
            assert.equal(t.segments.length, 3);
        });

        it('does NOT merge when result would reach 0xFFFF (BMP terminator)', function() {
            // 0xFFFD (index 1) and 0xFFFE (index 2) — contiguous with same delta
            // But merging would make end=0xFFFE which is < 0xFFFF, so it SHOULD merge
            // Only end === 0xFFFF is reserved for the terminator
            const glyphs = mockGlyphs([
                { unicodes: [] },
                { unicodes: [0xFFFD] },     // glyph 1
                { unicodes: [0xFFFE] },     // glyph 2
            ]);

            const t = makeCmapTable(glyphs);
            // Should merge: end=0xFFFE < 0xFFFF → 1 merged segment + terminator = 2
            assert.equal(t.segments.length, 2);
            assert.equal(t.segments[0].start, 0xFFFD);
            assert.equal(t.segments[0].end, 0xFFFE);
        });

        it('handles glyphs with multiple unicodes', function() {
            // Glyph 1 has two unicodes: 65 (A) and 100 (d)
            const glyphs = mockGlyphs([
                { unicodes: [] },
                { unicodes: [65, 100] },
            ]);

            const t = makeCmapTable(glyphs);
            // Two non-contiguous codepoints → 2 segments + terminator = 3
            assert.equal(t.segments.length, 3);
        });

        it('round-trips A-Z through toArrayBuffer and parse', function() {
            const notdefGlyph = new Glyph({
                name: '.notdef',
                advanceWidth: 650,
                path: new Path()
            });
            const glyphs = [notdefGlyph];
            for (let i = 0; i < 26; i++) {
                glyphs.push(new Glyph({
                    name: String.fromCharCode(65 + i),
                    unicode: 65 + i,
                    advanceWidth: 650,
                    path: new Path()
                }));
            }
            const font = new Font({
                familyName: 'TestFont',
                styleName: 'Regular',
                unitsPerEm: 1000,
                ascender: 800,
                descender: -200,
                glyphs: glyphs
            });
            const buffer = font.toArrayBuffer();
            const parsedFont = parse(buffer);

            for (let i = 0; i < 26; i++) {
                const char = String.fromCharCode(65 + i);
                const glyphIndex = parsedFont.charToGlyphIndex(char);
                assert.equal(glyphIndex, i + 1, `charToGlyphIndex('${char}') should be ${i + 1}, got ${glyphIndex}`);
            }
        });

        it('merges contiguous non-BMP segments for Format 12', function() {
            // Three contiguous emoji codepoints: U+1F600, U+1F601, U+1F602
            const glyphs = mockGlyphs([
                { unicodes: [] },
                { unicodes: [0x1F600] },    // glyph 1
                { unicodes: [0x1F601] },    // glyph 2
                { unicodes: [0x1F602] },    // glyph 3
            ]);

            const t = makeCmapTable(glyphs);
            assert.equal(t.numTables, 2); // Format 4 + Format 12
            // Non-BMP: segments above 0xFFFF are not subject to 0xFFFF guard
            // Should merge into 1 segment + terminator = 2
            assert.equal(t.segments.length, 2);
            assert.equal(t.segments[0].start, 0x1F600);
            assert.equal(t.segments[0].end, 0x1F602);
        });
    });
});