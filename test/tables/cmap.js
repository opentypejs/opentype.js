import assert from 'assert';
import { unhex } from '../testutil';
import { Parser } from '../../src/parse';
import { parseCmapTableFormat14, parseCmapTableFormat0 } from '../../src/tables/cmap';
import { parse } from '../../src/opentype.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('tables/cmap.js', function() {

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
});